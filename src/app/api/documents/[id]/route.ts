import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { deleteDocument, retryDocument, DocError } from "@/lib/document-service";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/** Document state endpoint: status, retry, and tombstoned deletion (PRD §10.1). */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const doc = getDb()
    .prepare(
      `SELECT d.id, d.title, d.state, d.error, d.current_version_id, v.char_count, v.page_count
       FROM documents d LEFT JOIN document_versions v ON v.id = d.current_version_id
       WHERE d.id = ? AND d.org_id = ? AND d.deleted_at IS NULL`
    )
    .get(params.id, ctx.ctx.orgId);
  if (!doc) return fail("not_found", 404);
  return ok({ document: doc });
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("admin");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const body = await readJson<{ action?: string }>(req);
  try {
    if (body?.action === "retry") {
      retryDocument(ctx.ctx.orgId, params.id);
      return ok({ status: "retried" });
    }
    if (body?.action === "delete") {
      // Preview count of conversations that will be removed with the document.
      const db = getDb();
      const conversations = db
        .prepare("SELECT id, source_deps FROM conversations WHERE org_id = ? AND deleted_at IS NULL")
        .all(ctx.ctx.orgId) as Array<{ id: string; source_deps: string }>;
      const affected = conversations.filter((conv) => {
        try {
          const deps = JSON.parse(conv.source_deps) as Array<{ docId: string }>;
          return deps.some((d) => d.docId === params.id);
        } catch {
          return false;
        }
      }).length;
      const deleted = deleteDocument(ctx.ctx.orgId, ctx.ctx.user.id, params.id);
      return ok({ status: "deleted", conversationsDeleted: deleted, conversationsAffected: affected });
    }
    return fail("bad_request", 400);
  } catch (e) {
    if (e instanceof DocError) return fail(e.code, e.code === "not_found" ? 404 : 400, { message: e.message });
    throw e;
  }
}
