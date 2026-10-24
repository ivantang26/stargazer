import { NextRequest } from "next/server";
import { ok, fail, rateLimit, clientIp, readJson, sameOrigin } from "@/lib/http";
import { findUserByEmail, createAuthToken } from "@/lib/auth";
import { send } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  if (!rateLimit(`forgot:${clientIp(req)}`, 10, 3_600_000)) return fail("rate_limited", 429);
  const body = await readJson<{ email?: string }>(req);
  const email = (body?.email ?? "").trim().toLowerCase();
  const user = findUserByEmail(email);
  // Always report success: the response must not reveal account existence.
  if (user) {
    const token = createAuthToken(user.id, "password_reset");
    const zh = user.locale === "zh-hant";
    send({
      to: email,
      kind: "password_reset",
      locale: zh ? "zh-hant" : "en",
      subject: zh ? "Stargazer：重設密碼" : "Stargazer: reset your password",
      body: zh
        ? "開啟以下連結以設定新密碼。連結有效期為二十四小時，且只可使用一次。"
        : "Open the link below to set a new password. The link is valid for twenty-four hours and can be used once.",
      link: `/${user.locale === "zh-hant" ? "zh-hant" : "en"}/reset?token=${token}`,
    });
  }
  return ok({ status: "sent" });
}
