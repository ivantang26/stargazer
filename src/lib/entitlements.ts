/**
 * Entitlement + usage engine (PRD §12.2, §12.3).
 *
 * Derives what an organization may currently do from its subscription row and
 * the versioned plan catalogue, and implements the atomic answer-unit ledger:
 * reserve → settle | release, where completion and cancellation compete
 * through a single server-side state transition. Allowance notifications fire
 * once at 80% and 100%.
 */
import { getDb, type SubscriptionStatus } from "./db";
import { planLimits, type PlanId, type PlanLimits } from "./plans";
import { nowIso } from "./util";
import { send } from "./mail";
import { track } from "./audit";

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

export function subscriptionFor(orgId: string): SubscriptionRow | null {
  return (getDb()
    .prepare("SELECT * FROM subscriptions WHERE org_id = ?")
    .get(orgId) as SubscriptionRow | undefined) ?? null;
}

export interface Entitlements {
  plan: PlanId;
  status: SubscriptionStatus;
  limits: PlanLimits;
  /** Effective answers allowance for the current period (includes proration). */
  allowance: number;
  used: number;
  reserved: number;
  remaining: number;
  periodStart: string | null;
  periodEnd: string | null;
  canGenerate: boolean;
  canUpload: boolean;
  readOnly: boolean;
  resetDate: string | null;
  graceEndsAt: string | null;
  readOnlyUntil: string | null;
  cancelAtPeriodEnd: boolean;
  notice: "trial" | "grace" | "read_only" | null;
}

export function entitlementsFor(orgId: string): Entitlements | null {
  const sub = subscriptionFor(orgId);
  if (!sub) return null;
  const limits = planLimits(sub.plan_id);

  // Grace: one bounded allowance, no larger than the previous plan's.
  const inGrace =
    sub.status === "past_due" && !!sub.grace_ends_at && new Date(sub.grace_ends_at as string).getTime() > Date.now();
  const allowance =
    sub.status === "past_due"
      ? Math.min(sub.period_allowance ?? limits.answers, limits.answers)
      : sub.period_allowance ?? limits.answers;

  const { used, reserved } = usageInPeriod(orgId, sub);
  const canGenerate =
    (["trialing", "active", "cancel_at_period_end"].includes(sub.status) ||
      (sub.status === "past_due" && inGrace)) &&
    used + reserved < allowance;

  const readOnly = ["read_only", "canceled"].includes(sub.status) ||
    (sub.status === "past_due" && !inGrace);

  return {
    plan: sub.plan_id,
    status: sub.status,
    limits,
    allowance,
    used,
    reserved,
    remaining: Math.max(0, allowance - used - reserved),
    periodStart: sub.current_period_start,
    periodEnd: sub.current_period_end,
    canGenerate,
    canUpload: ["trialing", "active", "cancel_at_period_end"].includes(sub.status) || !!inGrace,
    readOnly,
    resetDate: sub.current_period_end,
    graceEndsAt: sub.grace_ends_at,
    readOnlyUntil: sub.read_only_until,
    cancelAtPeriodEnd: sub.cancel_at_period_end === 1,
    notice:
      sub.status === "trialing"
        ? "trial"
        : sub.status === "past_due" && inGrace
          ? "grace"
          : readOnly
            ? "read_only"
            : null,
  };
}

export function usageInPeriod(
  orgId: string,
  sub: SubscriptionRow
): { used: number; reserved: number } {
  const start = sub.current_period_start ?? "1970-01-01";
  const rows = getDb()
    .prepare(
      `SELECT state, COUNT(*) AS n FROM usage_reservations
       WHERE org_id = ? AND is_demo = 0 AND created_at >= ? AND state IN ('settled','reserved')
       GROUP BY state`
    )
    .all(orgId, start) as Array<{ state: string; n: number }>;
  let used = 0;
  let reserved = 0;
  for (const r of rows) {
    if (r.state === "settled") used = r.n;
    if (r.state === "reserved") reserved = r.n;
  }
  return { used, reserved };
}

export class ReserveError extends Error {
  code: "quota_exceeded" | "generation_disabled" | "concurrency_limit" | "read_only";
  extra: Record<string, unknown>;
  constructor(code: ReserveError["code"], extra: Record<string, unknown> = {}) {
    super(code);
    this.code = code;
    this.extra = extra;
  }
}

/**
 * Atomically reserve one answer unit (PRD §12.3). The transaction checks the
 * generation flag, entitlement, allowance and the concurrency limit together,
 * so simultaneous requests can only ever consume valid remaining capacity.
 */
export function reserveAnswer(args: {
  orgId: string;
  userId: string;
  requestId: string;
  conversationId: string | null;
  isDemo?: boolean;
}): { reservationId: string } {
  const db = getDb();
  const generationEnabled = db
    .prepare("SELECT value FROM app_settings WHERE key = 'generation_enabled'")
    .get() as { value: string } | undefined;
  if (generationEnabled && generationEnabled.value !== "true") {
    throw new ReserveError("generation_disabled");
  }

  if (args.isDemo) {
    return { reservationId: insertReservation(args, true) };
  }

  const ent = entitlementsFor(args.orgId);
  if (!ent) throw new ReserveError("read_only");
  if (ent.readOnly || !ent.canGenerate) {
    throw new ReserveError("quota_exceeded", { resetDate: ent.resetDate, plan: ent.plan });
  }
  const { used, reserved } = usageInPeriod(args.orgId, subscriptionFor(args.orgId)!);
  if (used + reserved >= ent.allowance) {
    notifyAllowance(args.orgId, ent, "100");
    track("allowance_exhausted", { orgId: args.orgId });
    throw new ReserveError("quota_exceeded", { resetDate: ent.resetDate, plan: ent.plan });
  }
  const inflight = db
    .prepare(
      `SELECT COUNT(*) AS n FROM usage_reservations
       WHERE org_id = ? AND state = 'reserved' AND is_demo = 0`
    )
    .get(args.orgId) as { n: number };
  if (inflight.n >= ent.limits.concurrency) {
    throw new ReserveError("concurrency_limit", { limit: ent.limits.concurrency });
  }

  const reservationId = insertReservation(args, false);
  maybeNotifyUsage(args.orgId, ent, used + 1);
  return { reservationId };
}

function insertReservation(
  args: { orgId: string; userId: string; requestId: string; conversationId: string | null; isDemo?: boolean },
  isDemo: boolean
): string {
  const db = getDb();
  const id = `res_${args.requestId}`;
  db.prepare(
    `INSERT OR IGNORE INTO usage_reservations (id, org_id, user_id, conversation_id, request_id, state, is_demo, created_at)
     VALUES (?, ?, ?, ?, ?, 'reserved', ?, ?)`
  ).run(id, args.orgId, args.userId, args.conversationId, args.requestId, isDemo ? 1 : 0, nowIso());
  db.prepare(
    `INSERT INTO cost_events (id, org_id, request_id, kind, detail, created_at) VALUES (?, ?, ?, 'reserve', ?, ?)`
  ).run(`ce_${args.requestId}_reserve`, args.orgId, args.requestId, JSON.stringify({ isDemo }), nowIso());
  return id;
}

/** Settle a reservation: completion wins only from the reserved state. */
export function settleReservation(requestId: string): boolean {
  const db = getDb();
  const res = db
    .prepare(
      `UPDATE usage_reservations SET state = 'settled', settled_at = ?, reason = 'completed'
       WHERE request_id = ? AND state = 'reserved'`
    )
    .run(nowIso(), requestId);
  db.prepare(
    `INSERT INTO cost_events (id, org_id, request_id, kind, detail, created_at) VALUES (?, ?, ?, 'settle', '{}', ?)`
  ).run(`ce_${requestId}_settle`, getOrgForRequest(requestId), requestId, nowIso());
  return res.changes === 1;
}

/** Release a reservation: cancellation wins only from the reserved state. */
export function releaseReservation(requestId: string, reason: string): boolean {
  const db = getDb();
  const res = db
    .prepare(
      `UPDATE usage_reservations SET state = 'released', settled_at = ?, reason = ?
       WHERE request_id = ? AND state = 'reserved'`
    )
    .run(nowIso(), reason, requestId);
  db.prepare(
    `INSERT INTO cost_events (id, org_id, request_id, kind, detail, created_at) VALUES (?, ?, ?, 'release', ?, ?)`
  ).run(`ce_${requestId}_release`, getOrgForRequest(requestId), requestId, JSON.stringify({ reason }), nowIso());
  return res.changes === 1;
}

function getOrgForRequest(requestId: string): string | null {
  const row = getDb()
    .prepare("SELECT org_id FROM usage_reservations WHERE request_id = ?")
    .get(requestId) as { org_id: string } | undefined;
  return row?.org_id ?? null;
}

function maybeNotifyUsage(orgId: string, ent: Entitlements, usedAfterReserve: number): void {
  const pctUsed = ent.allowance > 0 ? (usedAfterReserve / ent.allowance) * 100 : 100;
  if (pctUsed >= 80 && pctUsed < 100) notifyAllowance(orgId, ent, "80");
  if (pctUsed >= 100) notifyAllowance(orgId, ent, "100");
}

function notifyAllowance(orgId: string, ent: Entitlements, level: "80" | "100"): void {
  const db = getDb();
  const col = level === "80" ? "allowance_80_notified" : "allowance_100_notified";
  const already = db
    .prepare(`SELECT ${col} AS v FROM subscriptions WHERE org_id = ?`)
    .get(orgId) as { v: string | null } | undefined;
  if (!already || already.v) return;
  db.prepare(`UPDATE subscriptions SET ${col} = ?, updated_at = ? WHERE org_id = ?`).run(
    nowIso(),
    nowIso(),
    orgId
  );
  const owner = db
    .prepare(
      `SELECT u.email, u.locale FROM users u JOIN memberships m ON m.user_id = u.id
       WHERE m.org_id = ? AND m.role = 'owner'`
    )
    .get(orgId) as { email: string; locale: string } | undefined;
  if (owner) {
    const zh = owner.locale === "zh-hant";
    send({
      to: owner.email,
      kind: `allowance_${level}`,
      locale: zh ? "zh-hant" : "en",
      subject: zh
        ? `Stargazer：答案額度已使用 ${level}%`
        : `Stargazer: ${level}% of your answer allowance used`,
      body: zh
        ? `您的工作區在本計費週期已使用 ${level}% 的答案額度（${ent.used}/${ent.allowance}）。額度將於 ${ent.resetDate ?? "下一週期"} 重設，您也可以升級計劃。`
        : `Your workspace has used ${level}% of this period's answer allowance (${ent.used}/${ent.allowance}). The allowance resets ${ent.resetDate ?? "at the next period"}, or you can upgrade your plan.`,
    });
  }
  db.prepare(
    `INSERT INTO notifications (id, org_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(
    `ntf_allowance_${orgId}_${level}_${ent.periodStart ?? ""}`,
    orgId,
    `allowance_${level}`,
    level === "80"
      ? `80% of the answer allowance for this period has been used (${ent.used}/${ent.allowance}).`
      : `The answer allowance for this period is fully used (${ent.used}/${ent.allowance}). Generation pauses until ${ent.resetDate ?? "the next period"}.`,
    nowIso()
  );
}

/** Seat allowance check: active members + unexpired invitations (PRD §11). */
export function seatsInUse(orgId: string): { seats: number; limit: number } {
  const db = getDb();
  const members = db
    .prepare("SELECT COUNT(*) AS n FROM memberships WHERE org_id = ?")
    .get(orgId) as { n: number };
  const pending = db
    .prepare(
      "SELECT COUNT(*) AS n FROM invitations WHERE org_id = ? AND accepted_at IS NULL AND expires_at > ?"
    )
    .get(orgId, nowIso()) as { n: number };
  return { seats: members.n + pending.n, limit: seatLimitFor(orgId) };
}

export function seatLimitFor(orgId: string): number {
  const sub = subscriptionFor(orgId);
  return sub ? planLimits(sub.plan_id).seats : 0;
}

/** Storage bytes currently counted for an organization, retained versions included. */
export function storageUsedBytes(orgId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(size_bytes), 0) AS total FROM document_versions
       WHERE org_id = ? AND state != 'purged'`
    )
    .get(orgId) as { total: number };
  return row.total;
}

export function documentCount(orgId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM documents WHERE org_id = ? AND deleted_at IS NULL")
    .get(orgId) as { n: number };
  return row.n;
}
