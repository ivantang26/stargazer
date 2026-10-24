import { NextRequest } from "next/server";
import { ok, fail, sameOrigin } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { createUpload, DocError } from "@/lib/document-service";
import { isAcceptedExtension } from "@/lib/ingest";
import { track } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Upload authorization (PRD §10.1). Only owners and administrators may add or
 * replace shared documents. Multipart: file + optional replaceDocumentId +
 * duplicate handling.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("admin");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const { ctx: c } = ctx;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("bad_request", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("bad_request", 400);
  const replaceDocumentId = typeof form.get("replaceDocumentId") === "string" ? (form.get("replaceDocumentId") as string) : undefined;
  const duplicateChoice = form.get("duplicate") === "replace" ? "replace" : "reject";

  try {
    const outcome = await createUpload({
      orgId: c.orgId,
      userId: c.user.id,
      filename: file.name,
      mime: file.type || "application/octet-stream",
      buffer: Buffer.from(await file.arrayBuffer()),
      replaceDocumentId,
      onDuplicate: duplicateChoice,
    });
    track("upload_complete", { userId: c.user.id, orgId: c.orgId, props: { replace: !!replaceDocumentId } });
    return ok(outcome);
  } catch (e) {
    if (e instanceof DocError) {
      const status =
        e.code === "duplicate_checksum" ? 409
        : e.code === "doc_limit" || e.code === "storage_limit" || e.code === "quota_exceeded" ? 402
        : e.code === "read_only" ? 403
        : 400;
      return fail(e.code, status, { message: e.message });
    }
    throw e;
  }
}
