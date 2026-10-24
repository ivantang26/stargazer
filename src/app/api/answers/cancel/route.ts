import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { cancelAnswer } from "@/lib/answer-service";

export const dynamic = "force-dynamic";

/** Cancellation competes with completion through the atomic reservation state. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("member");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const body = await readJson<{ requestId?: string }>(req);
  if (!body?.requestId) return fail("bad_request", 400);
  const cancelled = cancelAnswer(ctx.ctx.orgId, ctx.ctx.user.id, body.requestId);
  return ok({ cancelled });
}
