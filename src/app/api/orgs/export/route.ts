import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Data export (PRD §12.3): metadata + conversations, never another tenant's rows. */
export async function GET(req: NextRequest) {
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const { ctx: c } = ctx;
  const db = getDb();

  const org = db.prepare("SELECT id, name, created_at FROM organizations WHERE id = ?").get(c.orgId);
  const documents = db
    .prepare(
      `SELECT d.id, d.title, d.filename, d.state, d.created_at, v.version_no, v.char_count, v.page_count, v.superseded_at
       FROM documents d LEFT JOIN document_versions v ON v.id = d.current_version_id
       WHERE d.org_id = ? AND d.deleted_at IS NULL`
    )
    .all(c.orgId);
  const conversations = db
    .prepare(
      `SELECT id, title, created_at, updated_at FROM conversations
       WHERE org_id = ? AND creator_user_id = ? AND deleted_at IS NULL`
    )
    .all(c.orgId, c.user.id);
  const messages = db
    .prepare(
      `SELECT m.conversation_id, m.role, m.content, m.status, m.created_at
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE c.org_id = ? AND c.creator_user_id = ? AND c.deleted_at IS NULL
       ORDER BY m.created_at`
    )
    .all(c.orgId, c.user.id);
  const subscription = db.prepare("SELECT plan_id, status, current_period_start, current_period_end FROM subscriptions WHERE org_id = ?").get(c.orgId);

  const archive = {
    exportedAt: nowIso(),
    organization: org,
    subscription,
    documents,
    conversations,
    messages,
  };
  audit({ actorUserId: c.user.id, orgId: c.orgId, action: "org.export", scope: "organization", result: "success" });
  return new NextResponse(JSON.stringify(archive, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="stargazer-export-${c.orgId.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
