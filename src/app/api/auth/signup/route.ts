import { NextRequest } from "next/server";
import { ok, fail, rateLimit, clientIp, readJson, sameOrigin } from "@/lib/http";
import { createUser, createAuthToken, passwordProblems, createSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/db";
import { send } from "@/lib/mail";
import { track } from "@/lib/audit";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  await ensureSeeded();
  if (!rateLimit(`signup:${clientIp(req)}`, 10, 3_600_000)) return fail("rate_limited", 429);

  const body = await readJson<{
    email?: string;
    password?: string;
    name?: string;
    locale?: string;
    acceptedTerms?: boolean;
  }>(req);
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  const name = (body?.name ?? "").trim();
  const locale = isLocale(body?.locale ?? "") ? body!.locale! : "en";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("bad_request", 400);
  if (!body?.acceptedTerms) return fail("bad_request", 400);
  const pwProblems = passwordProblems(password);
  if (pwProblems.length > 0) return fail("password_weak", 400);

  const created = createUser(email, password, name, locale as "en" | "zh-hant");
  if (!created.ok) return fail("email_taken", 409);

  const token = createAuthToken(created.userId, "verify_email");
  const zh = locale === "zh-hant";
  send({
    to: email,
    kind: "verify_email",
    locale: zh ? "zh-hant" : "en",
    subject: zh ? "Stargazer：驗證您的電郵" : "Stargazer: verify your email",
    body: zh
      ? "歡迎使用 Stargazer。開啟以下連結以驗證您的電郵並繼續建立工作區。"
      : "Welcome to Stargazer. Open the link below to verify your email and continue creating your workspace.",
    link: `/api/auth/verify?token=${token}`,
  });
  // Session starts now; the workspace gate checks verification (PRD §9.2).
  await createSession(created.userId);
  track("signup_complete", { userId: created.userId, locale });
  return ok({ status: "verify_email_sent" });
}
