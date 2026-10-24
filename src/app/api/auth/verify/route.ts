import { NextRequest, NextResponse } from "next/server";
import { consumeAuthToken } from "@/lib/auth";
import { ensureSeeded, getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";

export const dynamic = "force-dynamic";

/** Email verification link target: consumes the single-use token and redirects. */
export async function GET(req: NextRequest) {
  await ensureSeeded();
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const userId = consumeAuthToken(token, "verify_email");
  const url = req.nextUrl.clone();
  if (!userId) {
    url.pathname = "/en/verify";
    url.searchParams.set("status", "invalid");
    return NextResponse.redirect(url);
  }
  getDb().prepare("UPDATE users SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL").run(nowIso(), userId);
  const user = getDb().prepare("SELECT locale FROM users WHERE id = ?").get(userId) as { locale: string };
  const locale = user.locale === "zh-hant" ? "zh-hant" : "en";
  url.pathname = `/${locale}/verify`;
  url.searchParams.set("status", "ok");
  return NextResponse.redirect(url);
}
