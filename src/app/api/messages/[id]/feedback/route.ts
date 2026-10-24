import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";

export const dynamic = "force-dynamic";

const KINDS = ["correctness", "sources", "missing", "language", "other"] as const;

/** Feedback records the issue class without attaching the conversation (PRD §13). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const body = await readJson<{ kind?: string; note?: string }>(req);
  const kind = KINDS.includes((body?.kind ?? "") as (typeof KINDS)[number]) ? body!.kind! : null;
  if (!kind) return fail("bad_request", 400);
  const note = (body?.note ?? "").slice(0, 1000);
  const db = getDb();
  const msg = db
    .prepare(
      `SELECT m.id FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE m.id = ? AND m.org_id = ? AND c.creator_user_id = ?`
    )
    .get(params.id, ctx.ctx.orgId, ctx.ctx.user.id);
  if (!msg) return fail("not_found", 404);
  db.prepare("UPDATE messages SET feedback = ? WHERE id = ?").run(
    JSON.stringify({ kind, note, at: nowIso() }),
    params.id
  );
  return ok({ status: "recorded" });
}
