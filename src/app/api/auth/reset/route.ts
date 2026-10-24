import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { consumeAuthToken, hashPassword, passwordProblems } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { newId, nowIso } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const body = await readJson<{ token?: string; password?: string }>(req);
  const token = body?.token ?? "";
  const password = body?.password ?? "";
  if (passwordProblems(password).length > 0) return fail("password_weak", 400);
  const userId = consumeAuthToken(token, "password_reset");
  if (!userId) return fail("expired", 400);
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), userId);
  // Password reset ends all sessions.
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  getDb()
    .prepare("INSERT INTO audit_log (id, actor_user_id, action, scope, result, created_at) VALUES (?, ?, 'auth.password_reset', 'account', 'success', ?)")
    .run(newId("aud"), userId, nowIso());
  return ok({ status: "reset" });
}
