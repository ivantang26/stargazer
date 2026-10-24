import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { startAnswer } from "@/lib/answer-service";

export const dynamic = "force-dynamic";

/**
 * The answer endpoint (PRD §16): authorize the user, reserve capacity,
 * retrieve current eligible sources, generate and validate the result, persist
 * it, and settle usage — each stage under the same request identifier. The
 * idempotency key is the requestId; a duplicate submission returns the same
 * conversation instead of charging twice.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const { ctx: c } = ctx;

  const body = await readJson<{
    question?: string;
    conversationId?: string | null;
    scopeDocIds?: string[] | null;
    idempotencyKey?: string;
  }>(req);
  const question = (body?.question ?? "").trim();

  if (body?.idempotencyKey) {
    // A retry with the same request identifier returns the existing result
    // rather than charging for a second identical operation (PRD §10.3).
    const db = (await import("@/lib/db")).getDb();
    const prior = db
      .prepare("SELECT request_id, conversation_id FROM usage_reservations WHERE request_id = ?")
      .get(body.idempotencyKey) as { request_id: string; conversation_id: string } | undefined;
    if (prior) {
      return ok({ conversationId: prior.conversation_id, requestId: prior.request_id, deduplicated: true });
    }
  }

  const result = startAnswer({
    orgId: c.orgId,
    userId: c.user.id,
    conversationId: body?.conversationId ?? null,
    question,
    scopeDocIds: Array.isArray(body?.scopeDocIds) ? body!.scopeDocIds! : null,
  });
  if (!result.ok) {
    const status =
      result.error === "quota_exceeded" ? 402
      : result.error === "concurrency_limit" ? 429
      : result.error === "generation_disabled" || result.error === "read_only" ? 503
      : 400;
    return fail(result.error, status, result.extra ?? {});
  }
  return ok({
    conversationId: result.conversationId,
    userMessageId: result.userMessageId,
    assistantMessageId: result.assistantMessageId,
    requestId: result.requestId,
  });
}
