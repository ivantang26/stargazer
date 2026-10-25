/**
 * Billing engine (PRD §12.2, §16).
 *
 * Simulates the Stripe-shaped lifecycle behind a narrow gateway interface:
 * checkout sessions → provider events → idempotent webhook processing →
 * entitlement state. A browser redirect is never payment evidence; only a
 * processed provider event (or reconciliation of authoritative state) changes
 * entitlement. Event IDs are deduplicated, and a monotonic sequence guard
 * prevents older events from overwriting current access.
 */
import { getDb, tx, type SubscriptionStatus } from "./db";
import {
  PLANS,
  PLAN_CATALOG_VERSION,
  TRIAL_DAYS,
  GRACE_DAYS,
  READ_ONLY_DAYS,
  planLimits,
  proratedAllowanceIncrease,
  proratedChargeHkd,
  type PlanId,
} from "./plans";
import { newId, nowIso, isoPlusDays } from "./util";
import { send } from "./mail";
import { track, audit } from "./audit";

export interface SubscriptionRow {
  id: string;
  org_id: string;
  plan_id: PlanId;
  plan_version: number;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  period_allowance: number | null;
  allowance_80_notified: string | null;
  allowance_100_notified: string | null;
  grace_ends_at: string | null;
  read_only_until: string | null;
  cancel_at_period_end: number;
  provider_ref: string | null;
  pending_plan_id: PlanId | null;
  last_event_seq: number;
  created_at: string;
  updated_at: string;
}

function getSub(orgId: string): SubscriptionRow | undefined {
  return getDb().prepare("SELECT * FROM subscriptions WHERE org_id = ?").get(orgId) as
    | SubscriptionRow
    | undefined;
}

function touch(sub: SubscriptionRow, patch: Partial<SubscriptionRow>): void {
  // Re-read current state first so consecutive patches never overwrite each
  // other with stale values, and explicit nulls clear fields as intended.
  const fresh = getSub(sub.org_id) ?? sub;
  const merged = { ...fresh, ...patch } as SubscriptionRow;
  getDb()
    .prepare(
      `UPDATE subscriptions SET plan_id = ?, status = ?, current_period_start = ?, current_period_end = ?,
        period_allowance = ?, allowance_80_notified = ?, allowance_100_notified = ?, grace_ends_at = ?,
        read_only_until = ?, cancel_at_period_end = ?, provider_ref = ?, pending_plan_id = ?,
        last_event_seq = ?, updated_at = ?
       WHERE org_id = ?`
    )
    .run(
      merged.plan_id,
      merged.status,
      merged.current_period_start,
      merged.current_period_end,
      merged.period_allowance,
      merged.allowance_80_notified,
      merged.allowance_100_notified,
      merged.grace_ends_at,
      merged.read_only_until,
      merged.cancel_at_period_end,
      merged.provider_ref,
      merged.pending_plan_id,
      merged.last_event_seq,
      nowIso(),
      sub.org_id
    );
}

/** Start the fourteen-day trial when a verified user creates an organization (PRD §9.2). */
export function startTrial(orgId: string): void {
  const now = new Date();
  getDb()
    .prepare(
      `INSERT INTO subscriptions (id, org_id, plan_id, plan_version, status, current_period_start,
         current_period_end, period_allowance, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, 'trial', ?, 'trialing', ?, ?, ?, 0, ?, ?)`
    )
    .run(
      newId("sub"),
      orgId,
      PLAN_CATALOG_VERSION,
      now.toISOString(),
      isoPlusDays(now, TRIAL_DAYS),
      PLANS.trial.limits.answers,
      nowIso(),
      nowIso()
    );
}

// ---------------------------------------------------------------------------
// Simulated gateway
// ---------------------------------------------------------------------------

export interface CheckoutRow {
  id: string;
  org_id: string;
  plan_id: PlanId;
  kind: "new" | "upgrade";
  status: "open" | "completed" | "expired" | "abandoned";
  prorated_charge_hkd: number | null;
  from_plan_id: PlanId | null;
  created_at: string;
  completed_at: string | null;
}

export function createCheckout(orgId: string, planId: PlanId): CheckoutRow | { error: string } {
  const sub = getSub(orgId);
  if (!sub) return { error: "not_found" };
  if (!PLANS[planId].purchasable) return { error: "not_purchasable" };
  const isUpgrade = sub.plan_id !== "trial" && sub.status !== "trialing";
  const charge = isUpgrade
    ? sub.current_period_start && sub.current_period_end
      ? proratedChargeHkd(sub.plan_id, planId, new Date(sub.current_period_start), new Date(sub.current_period_end))
      : PLANS[planId].priceHkd
    : PLANS[planId].priceHkd;
  const id = newId("cs");
  getDb()
    .prepare(
      `INSERT INTO checkout_sessions (id, org_id, plan_id, kind, status, prorated_charge_hkd, from_plan_id, created_at)
       VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`
    )
    .run(id, orgId, planId, isUpgrade ? "upgrade" : "new", charge, isUpgrade ? sub.plan_id : null, nowIso());
  track("checkout_start", { orgId, props: { plan: planId, kind: isUpgrade ? "upgrade" : "new" } });
  return getDb().prepare("SELECT * FROM checkout_sessions WHERE id = ?").get(id) as CheckoutRow;
}

/**
 * The "payment attempt" in the simulated gateway. Each outcome produces a
 * provider event exactly like a real gateway would: success raises
 * checkout.session.completed; failure raises nothing (the customer can retry).
 * Delayed confirmation is modeled by completing without immediate event
 * delivery — reconciliation later picks up authoritative state.
 */
export function simulatePayment(
  checkoutId: string,
  outcome: "pay" | "fail" | "delay",
  actorUserId: string
): { ok: boolean; status: string; message: string } {
  const db = getDb();
  const cs = db.prepare("SELECT * FROM checkout_sessions WHERE id = ?").get(checkoutId) as
    | CheckoutRow
    | undefined;
  if (!cs || cs.status !== "open") return { ok: false, status: "not_found", message: "Checkout session not open" };

  if (outcome === "fail") {
    db.prepare("UPDATE checkout_sessions SET status = 'abandoned', completed_at = ? WHERE id = ?").run(
      nowIso(),
      checkoutId
    );
    audit({
      actorUserId,
      orgId: cs.org_id,
      action: "billing.payment_failed",
      scope: "billing",
      result: "success",
      detail: { checkoutId },
    });
    return {
      ok: true,
      status: "payment_failed",
      message: "The payment was declined. No charge was made and your plan is unchanged.",
    };
  }

  db.prepare("UPDATE checkout_sessions SET status = 'completed', completed_at = ? WHERE id = ?").run(
    nowIso(),
    checkoutId
  );

  if (outcome === "pay") {
    enqueueProviderEvent(cs.org_id, "checkout.session.completed", { checkoutId, planId: cs.plan_id });
    return {
      ok: true,
      status: "processing",
      message: "Payment accepted. Subscription confirmation is processing.",
    };
  }
  // delay: webhook arrives late — the return page shows pending confirmation.
  // The status change reflects "payment received, entitlement not yet granted";
  // only the verified event or reconciliation activates the plan.
  const sub = getSub(cs.org_id);
  if (sub && ["trialing", "active"].includes(sub.status)) {
    touch(sub, { status: "pending_confirmation" });
  }
  return {
    ok: true,
    status: "pending_confirmation",
    message: "Payment accepted. Confirmation from the payment provider is delayed.",
  };
}

/** Provider-side subscription lifecycle operations raised as provider events. */
export function providerCancelAtPeriodEnd(orgId: string, actorUserId: string): void {
  enqueueProviderEvent(orgId, "customer.subscription.updated", { cancel_at_period_end: true });
  audit({ actorUserId, orgId, action: "billing.cancel_scheduled", scope: "billing", result: "success" });
}

export function providerResume(orgId: string, actorUserId: string): void {
  enqueueProviderEvent(orgId, "customer.subscription.updated", { cancel_at_period_end: false });
  audit({ actorUserId, orgId, action: "billing.resume", scope: "billing", result: "success" });
}

export function providerFailRenewal(orgId: string, actorUserId: string): void {
  enqueueProviderEvent(orgId, "invoice.payment_failed", {});
  audit({ actorUserId, orgId, action: "billing.renewal_failed_simulated", scope: "billing", result: "success" });
}

export function providerRenewPaid(orgId: string): void {
  enqueueProviderEvent(orgId, "invoice.paid", {});
}

// ---------------------------------------------------------------------------
// Webhook pipeline
// ---------------------------------------------------------------------------

let providerSeq = 0;

/** Record a provider event durably BEFORE any acknowledgement (PRD §16). */
export function enqueueProviderEvent(orgId: string, type: string, payload: Record<string, unknown>): string {
  const db = getDb();
  providerSeq += 1;
  const eventId = `evt_${Date.now().toString(36)}_${providerSeq.toString(36)}`;
  db.prepare(
    `INSERT INTO billing_events (id, org_id, event_id, type, payload, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'received', ?)`
  ).run(newId("bev"), orgId, eventId, type, JSON.stringify({ ...payload, seq: providerSeq }), nowIso());
  processPendingEvents(orgId);
  return eventId;
}

/** Duplicate delivery of an already-processed event ID must be a no-op. */
export function redeliverEvent(eventId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT org_id FROM billing_events WHERE event_id = ?").get(eventId) as
    | { org_id: string }
    | undefined;
  if (!row) return false;
  processPendingEvents(row.org_id);
  return true;
}

export function processPendingEvents(orgId: string): void {
  const db = getDb();
  const events = db
    .prepare(
      `SELECT * FROM billing_events WHERE org_id = ? AND status = 'received' ORDER BY created_at, id`
    )
    .all(orgId) as Array<{
    id: string;
    event_id: string;
    type: string;
    payload: string;
  }>;
  for (const ev of events) {
    try {
      const payload = JSON.parse(ev.payload) as Record<string, unknown> & { seq?: number };
      const sub = getSub(orgId);
      if (!sub) throw new Error("no subscription");
      const seq = typeof payload.seq === "number" ? payload.seq : 0;
      if (seq <= sub.last_event_seq) {
        db.prepare(
          `UPDATE billing_events SET status = 'ignored', result = 'stale event', processed_at = ? WHERE id = ?`
        ).run(nowIso(), ev.id);
        continue;
      }
      applyEvent(sub, ev.type, payload);
      touch(sub, { last_event_seq: seq });
      // Mark the checkout consumed so reconciliation does not re-apply it.
      db.prepare(
        `UPDATE checkout_sessions SET status = 'consumed' WHERE org_id = ? AND status = 'completed'`
      ).run(orgId);
      db.prepare(
        `UPDATE billing_events SET status = 'processed', result = ?, processed_at = ? WHERE id = ?`
      ).run("applied", nowIso(), ev.id);
    } catch (e) {
      db.prepare(`UPDATE billing_events SET status = 'error', result = ?, processed_at = ? WHERE id = ?`).run(
        e instanceof Error ? e.message : "error",
        nowIso(),
        ev.id
      );
    }
  }
}

function applyEvent(sub: SubscriptionRow, type: string, payload: Record<string, unknown>): void {
  switch (type) {
    case "checkout.session.completed": {
      const planId = (payload.planId as PlanId) ?? "starter";
      applyActivationOrUpgrade(sub, planId);
      break;
    }
    case "invoice.paid": {
      // Renewal: new period, fresh full allowance (and apply a pending downgrade).
      const now = new Date();
      const nextPlan = (sub.pending_plan_id as PlanId | null) ?? sub.plan_id;
      touch(sub, {
        plan_id: nextPlan,
        plan_version: PLAN_CATALOG_VERSION,
        status: "active",
        pending_plan_id: null,
        current_period_start: now.toISOString(),
        current_period_end: isoPlusDays(now, 30),
        period_allowance: planLimits(nextPlan).answers,
        allowance_80_notified: null,
        allowance_100_notified: null,
        cancel_at_period_end: 0,
        grace_ends_at: null,
      });
      recordInvoice(sub.org_id, nextPlan, PLANS[nextPlan].priceHkd, "subscription");
      break;
    }
    case "invoice.payment_failed": {
      if (!["active", "cancel_at_period_end", "past_due"].includes(sub.status)) return;
      const boundedAllowance = Math.min(sub.period_allowance ?? planLimits(sub.plan_id).answers, planLimits(sub.plan_id).answers);
      touch(sub, {
        status: "past_due",
        grace_ends_at: isoPlusDays(new Date(), GRACE_DAYS),
        // Grace allowance attaches to the overdue period and is never larger
        // than the previous plan's; duplicate events cannot grant it again.
        period_allowance: boundedAllowance,
        allowance_80_notified: null,
        allowance_100_notified: null,
      });
      notifyOwner(sub.org_id, "renewal_failed");
      break;
    }
    case "customer.subscription.updated": {
      if (payload.cancel_at_period_end === true) {
        touch(sub, { cancel_at_period_end: 1 });
        notifyOwner(sub.org_id, "cancel_scheduled");
        track("subscription_cancelled", { orgId: sub.org_id });
      } else if (payload.cancel_at_period_end === false) {
        touch(sub, { cancel_at_period_end: 0 });
      }
      break;
    }
    case "customer.subscription.deleted": {
      if (["canceled", "read_only"].includes(sub.status)) return;
      touch(sub, {
        status: "read_only",
        read_only_until: sub.read_only_until ?? isoPlusDays(new Date(), READ_ONLY_DAYS),
        cancel_at_period_end: 0,
      });
      notifyOwner(sub.org_id, "subscription_deleted");
      break;
    }
    default:
      break;
  }
}

function applyActivationOrUpgrade(sub: SubscriptionRow, planId: PlanId): void {
  const now = new Date();
  if (sub.status === "trialing" || sub.status === "pending_confirmation") {
    // First paid activation.
    touch(sub, {
      plan_id: planId,
      plan_version: PLAN_CATALOG_VERSION,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: isoPlusDays(now, 30),
      period_allowance: planLimits(planId).answers,
      allowance_80_notified: null,
      allowance_100_notified: null,
      grace_ends_at: null,
      cancel_at_period_end: 0,
      provider_ref: newId("simsub"),
    });
    recordInvoice(sub.org_id, planId, PLANS[planId].priceHkd, "subscription");
    notifyOwner(sub.org_id, "activated", planId);
    track("paid_activation", { orgId: sub.org_id, props: { plan: planId } });
    return;
  }
  // Upgrade inside a paid period: keep the billing date, prorate the increase
  // in the cycle allowance, preserve consumed units (PRD §12.2).
  const start = sub.current_period_start ? new Date(sub.current_period_start) : now;
  const end = sub.current_period_end ? new Date(sub.current_period_end) : new Date(now.getTime() + 30 * 86400000);
  const increase = proratedAllowanceIncrease(sub.plan_id, planId, start, end, now);
  const currentAllowance = sub.period_allowance ?? planLimits(sub.plan_id).answers;
  touch(sub, {
    plan_id: planId,
    plan_version: PLAN_CATALOG_VERSION,
    status: "active",
    period_allowance: currentAllowance + increase,
    grace_ends_at: null,
  });
  const charge = proratedChargeHkd(sub.plan_id, planId, start, end, now);
  recordInvoice(sub.org_id, planId, charge, "proration");
  notifyOwner(sub.org_id, "upgraded", planId);
  track("paid_activation", { orgId: sub.org_id, props: { plan: planId, kind: "upgrade" } });
}

function recordInvoice(orgId: string, planId: PlanId, amountHkd: number, kind: "subscription" | "proration"): void {
  const db = getDb();
  const seq = (db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE org_id = ?").get(orgId) as { n: number }).n;
  db.prepare(
    `INSERT INTO invoices (id, org_id, number, plan_id, amount_hkd, kind, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)`
  ).run(newId("inv"), orgId, `INV-${new Date().getFullYear()}-${String(seq + 1).padStart(4, "0")}`, planId, amountHkd, kind, nowIso());
}

function notifyOwner(orgId: string, kind: string, planId?: PlanId): void {
  const db = getDb();
  const owner = db
    .prepare(
      `SELECT u.email, u.locale, u.name FROM users u JOIN memberships m ON m.user_id = u.id
       WHERE m.org_id = ? AND m.role = 'owner'`
    )
    .get(orgId) as { email: string; locale: string; name: string } | undefined;
  if (!owner) return;
  const zh = owner.locale === "zh-hant";
  const messages: Record<string, { subject: string; body: string }> = {
    activated: {
      subject: zh ? "Stargazer：訂閱已生效" : "Stargazer: your subscription is active",
      body: zh
        ? `您的 ${PLANS[planId ?? "starter"].nameZh} 訂閱已生效，帳單週期由今天開始。`
        : `Your ${PLANS[planId ?? "starter"].nameEn} subscription is now active; the billing period starts today.`,
    },
    upgraded: {
      subject: zh ? "Stargazer：計劃已升級" : "Stargazer: plan upgraded",
      body: zh
        ? `您的工作區已升級至 ${PLANS[planId ?? "team"].nameZh}，席位及儲存空間即時生效，答案額度已按剩餘週期按比例增加。`
        : `Your workspace upgraded to ${PLANS[planId ?? "team"].nameEn}. Seats and storage apply immediately; the answer allowance increased by the prorated remainder of the period.`,
    },
    cancel_scheduled: {
      subject: zh ? "Stargazer：訂閱將於週期結束時取消" : "Stargazer: subscription will cancel at period end",
      body: zh
        ? `您的訂閱將於本計費週期結束時取消，之後有三十天唯讀及匯出期。`
        : `Your subscription will cancel at the end of the current billing period, followed by thirty days of read and export access.`,
    },
    renewal_failed: {
      subject: zh ? "Stargazer：續費付款失敗" : "Stargazer: renewal payment failed",
      body: zh
        ? `最近一次續費付款失敗。我們提供三天寬限期（額度不超過原計劃），請更新付款方式。`
        : `The latest renewal payment failed. A three-day grace period applies (bounded allowance, no larger than your previous plan). Please update your payment method.`,
    },
    subscription_deleted: {
      subject: zh ? "Stargazer：訂閱已結束" : "Stargazer: subscription ended",
      body: zh
        ? `訂閱已結束。您的內容保留三十天供閱讀及匯出，之後將安排刪除。`
        : `Your subscription has ended. Content remains readable and exportable for thirty days before scheduled deletion.`,
    },
    trial_ending: {
      subject: zh ? "Stargazer：試用即將結束" : "Stargazer: your trial is ending",
      body: zh
        ? `您的工作區試用將於三天後結束。試用無需信用卡，也不會自動轉為收費。`
        : `Your workspace trial ends in three days. No card is required and the trial never converts automatically into a charge.`,
    },
    deletion_scheduled: {
      subject: zh ? "Stargazer：內容刪除安排" : "Stargazer: content deletion scheduled",
      body: zh
        ? `保留期即將結束，工作區內容將按刪除政策移除。`
        : `The retention window is closing; workspace content will be removed under the deletion policy.`,
    },
  };
  const m = messages[kind];
  if (!m) return;
  send({ to: owner.email, kind, subject: m.subject, body: m.body, locale: zh ? "zh-hant" : "en" });
  db.prepare(
    `INSERT INTO notifications (id, org_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(newId("ntf"), orgId, kind, m.subject, nowIso());
}

// ---------------------------------------------------------------------------
// Scheduled reconciliation (PRD §16: catches missed transitions)
// ---------------------------------------------------------------------------

export function runReconciliation(): void {
  const db = getDb();
  const subs = db.prepare("SELECT * FROM subscriptions").all() as SubscriptionRow[];
  const now = Date.now();
  for (const sub of subs) {
    // 1. Completed checkouts still pending confirmation: pull authoritative state.
    if (sub.status === "pending_confirmation") {
      const completed = db
        .prepare(
          `SELECT plan_id FROM checkout_sessions WHERE org_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1`
        )
        .get(sub.org_id) as { plan_id: PlanId } | undefined;
      if (completed) {
        applyEvent(sub, "checkout.session.completed", { planId: completed.plan_id });
        touch(sub, { last_event_seq: sub.last_event_seq + 1 });
        db.prepare(
          `UPDATE checkout_sessions SET status = 'consumed' WHERE org_id = ? AND status = 'completed'`
        ).run(sub.org_id);
      }
    }
    // 2. A completed checkout exists while the subscription has not been
    //    activated: the webhook was lost or delayed. Pull authoritative state
    //    (the provider-side session is complete) and apply it exactly once.
    if (["trialing", "pending_confirmation", "active"].includes(sub.status)) {
      const completed = db
        .prepare(
          `SELECT plan_id FROM checkout_sessions WHERE org_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1`
        )
        .get(sub.org_id) as { plan_id: PlanId } | undefined;
      if (completed) {
        applyEvent(sub, "checkout.session.completed", { planId: completed.plan_id });
        touch(sub, { last_event_seq: sub.last_event_seq + 1 });
        db.prepare(
          `UPDATE checkout_sessions SET status = 'consumed' WHERE org_id = ? AND status = 'completed'`
        ).run(sub.org_id);
      }
    }
    // 3. Trial expiry → 30-day read/export window.
    if (sub.status === "trialing" && sub.current_period_end && new Date(sub.current_period_end).getTime() < now) {
      touch(sub, { status: "read_only", read_only_until: isoPlusDays(new Date(), READ_ONLY_DAYS) });
      notifyOwner(sub.org_id, "subscription_deleted");
    }
    // 4. Trial-ending notice three days ahead.
    if (sub.status === "trialing" && sub.current_period_end) {
      const daysLeft = (new Date(sub.current_period_end).getTime() - now) / 86400000;
      if (daysLeft <= 3 && daysLeft > 2) {
        const key = "trial_notice_sent";
        const sent = db
          .prepare("SELECT value FROM app_settings WHERE key = ?")
          .get(`${key}:${sub.org_id}`) as { value: string } | undefined;
        if (!sent) {
          db.prepare("INSERT INTO app_settings (key, value) VALUES (?, '1')").run(`${key}:${sub.org_id}`);
          notifyOwner(sub.org_id, "trial_ending");
        }
      }
    }
    // 5. Paid period end: renew if not cancelling; else read-only window.
    if (
      ["active", "cancel_at_period_end"].includes(sub.status) &&
      sub.current_period_end &&
      new Date(sub.current_period_end).getTime() < now
    ) {
      if (sub.cancel_at_period_end === 1) {
        touch(sub, { status: "read_only", read_only_until: isoPlusDays(new Date(), READ_ONLY_DAYS) });
        notifyOwner(sub.org_id, "subscription_deleted");
      } else {
        providerRenewPaid(sub.org_id);
      }
    }
    // 6. Grace expiry → read-only.
    if (sub.status === "past_due" && sub.grace_ends_at && new Date(sub.grace_ends_at).getTime() < now) {
      touch(sub, { status: "read_only", read_only_until: isoPlusDays(new Date(), READ_ONLY_DAYS) });
      notifyOwner(sub.org_id, "subscription_deleted");
    }
    // 7. Read-only window closed → canceled; schedule deletion job.
    if (
      sub.status === "read_only" &&
      sub.read_only_until &&
      new Date(sub.read_only_until).getTime() < now
    ) {
      touch(sub, { status: "canceled" });
      notifyOwner(sub.org_id, "deletion_scheduled");
      enqueueJob(sub.org_id, "purge_organization_content", { reason: "retention_window_closed" });
    }
  }
}

// ---------------------------------------------------------------------------
// Organization deletion workflow (PRD §17)
// ---------------------------------------------------------------------------

export function requestOrganizationDeletion(orgId: string, actorUserId: string): void {
  const db = getDb();
  const progress = { subscription_canceled: "pending", content_deleted: "pending" };
  db.prepare(
    `UPDATE organizations SET deletion_status = 'requested', deletion_progress = ?,
       deletion_requested_at = ? WHERE id = ?`
  ).run(JSON.stringify(progress), nowIso(), orgId);
  audit({ actorUserId, orgId, action: "org.deletion_requested", scope: "organization", result: "success" });
  // Cancel renewal with the provider first; content deletion must never leave
  // an unnoticed renewing subscription.
  enqueueJob(orgId, "organization_deletion_phase1", { actorUserId });
}

export function enqueueJob(
  orgId: string | null,
  type: string,
  payload: Record<string, unknown>,
  dedupeKey?: string
): string {
  const db = getDb();
  const id = newId("job");
  const now = nowIso();
  if (dedupeKey) {
    const existing = db.prepare("SELECT id FROM jobs WHERE dedupe_key = ?").get(dedupeKey) as
      | { id: string }
      | undefined;
    if (existing) return existing.id;
  }
  db.prepare(
    `INSERT INTO jobs (id, org_id, type, payload, dedupe_key, status, run_after, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?)`
  ).run(id, orgId, type, JSON.stringify(payload), dedupeKey ?? null, now, now, now);
  return id;
}

export { getSub, notifyOwner };
