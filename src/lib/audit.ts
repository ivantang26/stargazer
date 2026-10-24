/**
 * Security audit trail (PRD §16: actor, scope, action, timestamp, result)
 * and privacy-conscious analytics events (PRD §20: no document names, prompt
 * bodies, generated answers, email addresses, or file URLs in analytics).
 */
import { getDb } from "./db";
import { newId, nowIso } from "./util";

export function audit(entry: {
  actorUserId?: string | null;
  orgId?: string | null;
  action: string;
  scope: string;
  result: "success" | "denied" | "error";
  detail?: Record<string, unknown>;
}): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log (id, actor_user_id, org_id, action, scope, result, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      newId("aud"),
      entry.actorUserId ?? null,
      entry.orgId ?? null,
      entry.action,
      entry.scope,
      entry.result,
      entry.detail ? JSON.stringify(entry.detail) : null,
      nowIso()
    );
}

export type AnalyticsEventName =
  | "product_page_view"
  | "demo_start"
  | "demo_answer"
  | "source_open"
  | "signup_complete"
  | "workspace_created"
  | "upload_complete"
  | "first_own_document_answer"
  | "invitation_accepted"
  | "checkout_start"
  | "paid_activation"
  | "allowance_exhausted"
  | "subscription_cancelled"
  | "lead_submitted";

export function track(
  name: AnalyticsEventName,
  ctx: { anonId?: string | null; userId?: string | null; orgId?: string | null; locale?: string | null; props?: Record<string, unknown> }
): void {
  getDb()
    .prepare(
      `INSERT INTO analytics_events (id, name, schema_version, anon_id, user_id, org_id, locale, props, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      newId("evt"),
      name,
      ctx.anonId ?? null,
      ctx.userId ?? null,
      ctx.orgId ?? null,
      ctx.locale ?? null,
      ctx.props ? JSON.stringify(ctx.props) : null,
      nowIso()
    );
}
