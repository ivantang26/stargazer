import { NextRequest } from "next/server";
import { ok, fail, rateLimit, clientIp, readJson, sameOrigin } from "@/lib/http";
import { findUserByEmail, verifyPassword, createSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  await ensureSeeded();
  if (!rateLimit(`login:${clientIp(req)}`, 20, 600_000)) return fail("rate_limited", 429);

  const body = await readJson<{ email?: string; password?: string }>(req);
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return fail("invalid_credentials", 401);
  }
  await createSession(user.id);
  return ok({ status: "signed_in", verified: !!user.email_verified_at });
}
