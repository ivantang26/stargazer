import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { requireOrgContext, getConversation } from "@/lib/data-access";
import { getDb } from "@/lib/db";
import { clampString, nowIso } from "@/lib/util";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/**
 * A conversation belongs to its creator only (PRD §10.3) — the query filters
 * by creator inside the organization boundary, so an admin or another member
 * cannot read someone else's history even with a valid session.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const conv = getConversation(ctx.ctx.orgId, ctx.ctx.user.id, params.id);
  if (!conv) return fail("not_found", 404);
  return ok({
    conversation: {
      id: conv.id,
      title: conv.title,
      updated_at: conv.updated_at,
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations ? JSON.parse(m.citations) : null,
        status: m.status,
        request_id: m.request_id,
        feedback: m.feedback ? JSON.parse(m.feedback) : null,
        created_at: m.created_at,
      })),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const body = await readJson<{ title?: string }>(req);
  const title = clampString(body?.title, 120);
  if (!title) return fail("bad_request", 400);
  const res = getDb()
    .prepare(
      "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND org_id = ? AND creator_user_id = ? AND deleted_at IS NULL"
    )
    .run(title, nowIso(), params.id, ctx.ctx.orgId, ctx.ctx.user.id);
  if (res.changes === 0) return fail("not_found", 404);
  return ok({ title });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const res = getDb()
    .prepare(
      "UPDATE conversations SET deleted_at = ? WHERE id = ? AND org_id = ? AND creator_user_id = ? AND deleted_at IS NULL"
    )
    .run(nowIso(), params.id, ctx.ctx.orgId, ctx.ctx.user.id);
  if (res.changes === 0) return fail("not_found", 404);
  return ok({ status: "deleted" });
}
