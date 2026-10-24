/**
 * Organization service: creation with trial start, invitations with expiry
 * and seat capacity, role changes with reauthenticated ownership transfer,
 * and the durable organization-deletion workflow (PRD §9.2, §11, §17).
 */
import { getDb, tx, type Role } from "./db";
import { newId, newToken, nowIso, isoPlusDays } from "./util";
import { startTrial, enqueueJob } from "./billing";
import { send } from "./mail";
import { audit, track } from "./audit";
import { seatsInUse } from "./entitlements";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { ensureDataDir } from "./util";

export function createOrganization(ownerUserId: string, name: string, ownerEmail: string, ownerLocale: "en" | "zh-hant"): string {
  const orgId = newId("org");
  tx(() => {
    const db = getDb();
    db.prepare(
      `INSERT INTO organizations (id, name, owner_user_id, onboarding_step, created_at)
       VALUES (?, ?, ?, 'naming', ?)`
    ).run(orgId, name.trim().slice(0, 120) || "My workspace", ownerUserId, nowIso());
    db.prepare(
      `INSERT INTO memberships (id, org_id, user_id, role, created_at) VALUES (?, ?, ?, 'owner', ?)`
    ).run(newId("mem"), orgId, ownerUserId, nowIso());
    startTrial(orgId);
  });
  track("workspace_created", { userId: ownerUserId, orgId });
  const zh = ownerLocale === "zh-hant";
  send({
    to: ownerEmail,
    kind: "workspace_created",
    locale: ownerLocale,
    subject: zh ? "Stargazer：您的工作區已建立" : "Stargazer: your workspace is ready",
    body: zh
      ? `歡迎使用 Stargazer。您的十四天試用已開始：1 個席位、50 個答案額度、10 份文件及 100 MB 儲存空間。無需信用卡，試用結束後不會自動收費。`
      : `Welcome to Stargazer. Your fourteen-day trial has started: one seat, fifty answers, ten documents, and 100 MB of storage. No payment card is required, and the trial never converts automatically into a charge.`,
  });
  return orgId;
}

export interface InviteResult {
  ok: boolean
  error?: "seat_limit" | "invalid_role"
  invitationId?: string
}

export function inviteMember(
  orgId: string,
  inviterUserId: string,
  inviterRole: Role,
  email: string,
  role: "admin" | "member"
): InviteResult {
  // An administrator can invite only ordinary members (PRD §11).
  if (inviterRole === "admin" && role !== "member") return { ok: false, error: "invalid_role" };
  const { seats, limit } = seatsInUse(orgId);
  if (seats >= limit) return { ok: false, error: "seat_limit" };

  const db = getDb();
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase()) as
    | { id: string }
    | undefined;
  if (existingUser) {
    const member = db
      .prepare("SELECT id FROM memberships WHERE org_id = ? AND user_id = ?")
      .get(orgId, existingUser.id);
    if (member) return { ok: false, error: "seat_limit" };
  }

  const invitationId = newId("inv");
  const token = newToken(20);
  db.prepare(
    `INSERT INTO invitations (id, org_id, email, role, token, invited_by, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(invitationId, orgId, email.toLowerCase(), role, token, inviterUserId, isoPlusDays(new Date(), 7), nowIso());
  const org = db.prepare("SELECT name FROM organizations WHERE id = ?").get(orgId) as { name: string };
  send({
    to: email,
    kind: "invitation",
    subject: `Stargazer: you are invited to “${org.name}”`,
    body: `You have been invited to join the workspace “${org.name}” on Stargazer. This invitation expires in seven days and can be accepted once, by this email address only.`,
    link: `/invite/accept?token=${token}`,
  });
  audit({ actorUserId: inviterUserId, orgId, action: "team.invite", scope: "team", result: "success", detail: { role } });
  return { ok: true, invitationId };
}

export function acceptInvitation(
  token: string,
  userId: string,
  email: string
): { ok: true; orgId: string } | { ok: false; error: string } {
  const db = getDb();
  const inv = db.prepare("SELECT * FROM invitations WHERE token = ?").get(token) as
    | { id: string; org_id: string; email: string; role: Role; expires_at: string; accepted_at: string | null }
    | undefined;
  if (!inv) return { ok: false, error: "not_found" };
  if (inv.accepted_at) return { ok: false, error: "already_accepted" };
  if (new Date(inv.expires_at).getTime() < Date.now()) return { ok: false, error: "expired" };
  // Single-use, email-bound: the accepting verified account must match.
  if (inv.email !== email.toLowerCase()) return { ok: false, error: "email_mismatch" };
  const { seats, limit } = seatsInUse(inv.org_id);
  if (seats >= limit) return { ok: false, error: "seat_limit" };
  tx(() => {
    db.prepare("UPDATE invitations SET accepted_at = ?, accepted_user_id = ? WHERE id = ?").run(nowIso(), userId, inv.id);
    db.prepare(
      `INSERT INTO memberships (id, org_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(newId("mem"), inv.org_id, userId, inv.role, nowIso());
  });
  track("invitation_accepted", { userId, orgId: inv.org_id });
  return { ok: true, orgId: inv.org_id };
}

/** Ownership transfer requires reauthentication and an active recipient. */
export function transferOwnership(orgId: string, fromUserId: string, toUserId: string): boolean {
  const db = getDb();
  const target = db
    .prepare("SELECT m.role FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND m.user_id = ? AND u.email_verified_at IS NOT NULL")
    .get(orgId, toUserId) as { role: Role } | undefined;
  if (!target) return false;
  tx(() => {
    db.prepare("UPDATE memberships SET role = 'owner' WHERE org_id = ? AND user_id = ?").run(orgId, toUserId);
    db.prepare("UPDATE memberships SET role = 'admin' WHERE org_id = ? AND user_id = ?").run(orgId, fromUserId);
    db.prepare("UPDATE organizations SET owner_user_id = ? WHERE id = ?").run(toUserId, orgId);
  });
  audit({ actorUserId: fromUserId, orgId, action: "team.ownership_transferred", scope: "team", result: "success" });
  return true;
}

/** Cancel the subscription immediately with the provider and mark deletion progress. */
export function providerCancelSubscriptionImmediately(orgId: string, actorUserId: string): void {
  const db = getDb();
  // Simulated provider confirmation is synchronous here; a real integration
  // waits for the provider's deletion webhook before marking 'done'.
  db.prepare(
    `UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = 0, updated_at = ? WHERE org_id = ?`
  ).run(nowIso(), orgId);
  db.prepare(
    `INSERT INTO billing_events (id, org_id, event_id, type, payload, status, result, created_at, processed_at)
     VALUES (?, ?, ?, 'customer.subscription.deleted', ?, 'processed', 'simulated immediate cancellation', ?, ?)`
  ).run(newId("bev"), orgId, newId("evt"), JSON.stringify({ orgId }), nowIso(), nowIso());
  setDeletionProgress(orgId, { subscription_canceled: "done" });
  audit({ actorUserId, orgId, action: "billing.subscription_canceled", scope: "billing", result: "success" });
}

function setDeletionProgress(orgId: string, patch: Record<string, string>): void {
  const db = getDb();
  const org = db
    .prepare("SELECT deletion_progress FROM organizations WHERE id = ?")
    .get(orgId) as { deletion_progress: string | null } | undefined;
  const progress = org?.deletion_progress ? JSON.parse(org.deletion_progress) : {};
  const next = { ...progress, ...patch };
  db.prepare("UPDATE organizations SET deletion_progress = ?, deletion_status = 'running' WHERE id = ?").run(
    JSON.stringify(next),
    orgId
  );
}

/** Remove product content while retaining approved billing and audit records. */
export async function deleteOrganizationContent(orgId: string, reason: string): Promise<void> {
  const db = getDb();
  const versions = db
    .prepare("SELECT storage_path FROM document_versions WHERE org_id = ?")
    .all(orgId) as Array<{ storage_path: string | null }>;
  tx(() => {
    db.prepare("DELETE FROM chunks WHERE org_id = ?").run(orgId);
    db.prepare("DELETE FROM messages WHERE org_id = ?").run(orgId);
    db.prepare("DELETE FROM conversations WHERE org_id = ?").run(orgId);
    db.prepare("DELETE FROM document_versions WHERE org_id = ?").run(orgId);
    db.prepare("DELETE FROM documents WHERE org_id = ?").run(orgId);
    db.prepare(
      `INSERT INTO deletion_register (id, org_id, kind, progress, completed_at, created_at)
       VALUES (?, ?, 'organization', ?, ?, ?)`
    ).run(newId("del"), orgId, JSON.stringify({ reason, content: "deleted" }), nowIso(), nowIso());
  });
  for (const v of versions) {
    if (v.storage_path) {
      try {
        await unlink(path.join(ensureDataDir(), v.storage_path));
      } catch {
        // already gone
      }
    }
  }
  setDeletionProgress(orgId, { content_deleted: "done" });
  db.prepare(
    `UPDATE organizations SET deletion_status = 'complete', deletion_progress = ? WHERE id = ?`
  ).run(JSON.stringify({ subscription_canceled: "done", content_deleted: "done" }), orgId);
}

export function deletionStatus(orgId: string): {
  status: string | null;
  progress: { subscription_canceled?: string; content_deleted?: string };
} {
  const db = getDb();
  const org = db
    .prepare("SELECT deletion_status, deletion_progress FROM organizations WHERE id = ?")
    .get(orgId) as { deletion_status: string | null; deletion_progress: string | null } | undefined;
  if (!org) return { status: null, progress: {} };
  return {
    status: org.deletion_status,
    progress: org.deletion_progress ? JSON.parse(org.deletion_progress) : {},
  };
}
