import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { currentUser, hashPassword, passwordProblems, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { clampString } from "@/lib/util";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Profile + security mutations for the signed-in user. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("unauthenticated", 401);
  const body = await readJson<{
    action?: string;
    name?: string;
    locale?: string;
    currentPassword?: string;
    newPassword?: string;
  }>(req);
  const db = getDb();

  switch (body?.action) {
    case "update_profile": {
      const name = clampString(body.name, 120);
      const locale = isLocale(body.locale ?? "") ? body.locale! : user.locale;
      db.prepare("UPDATE users SET name = ?, locale = ? WHERE id = ?").run(name || user.name, locale, user.id);
      return ok({ status: "updated" });
    }
    case "change_password": {
      const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
      if (!body.currentPassword || !verifyPassword(body.currentPassword, row.password_hash)) {
        return fail("invalid_credentials", 403);
      }
      if (!body.newPassword || passwordProblems(body.newPassword).length > 0) {
        return fail("password_weak", 400);
      }
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(body.newPassword), user.id);
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
      audit({ actorUserId: user.id, action: "auth.password_changed", scope: "account", result: "success" });
      return ok({ status: "changed" });
    }
    default:
      return fail("bad_request", 400);
  }
}
