import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ensureSeeded, getDb } from "@/lib/db";
import { ok, fail, rateLimit, clientIp, readJson, sameOrigin } from "@/lib/http";
import { runDemoAnswer } from "@/lib/answer-service";
import { DEMO_LIMITS } from "@/lib/plans";
import { getSetting } from "@/lib/db";
import { newToken, nowIso, sha256Hex } from "@/lib/util";
import { track } from "@/lib/audit";

export const dynamic = "force-dynamic";

const DEMO_COOKIE = "sg_demo";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  await ensureSeeded();

  const body = await readJson<{ question?: string }>(req);
  const question = (body?.question ?? "").trim().slice(0, 1000);
  if (!question) return fail("bad_request", 400);

  // Server-side abuse limits beyond the per-session cap (PRD §9.1).
  const ip = clientIp(req);
  if (!rateLimit(`demo:${ip}`, DEMO_LIMITS.questionsPerHourPerIp, 3_600_000)) {
    return fail("rate_limited", 429);
  }

  // A global spending cap can disable generation while the website keeps working.
  if (getSetting("demo_enabled", "true") !== "true") {
    return fail("generation_disabled", 503);
  }

  const jar = cookies();
  let token = jar.get(DEMO_COOKIE)?.value;
  const db = getDb();
  let used = 0;
  if (!token) {
    token = newToken(18);
    db.prepare("INSERT INTO demo_sessions (token, ip_hash, questions_used, created_at, last_at) VALUES (?, ?, 0, ?, ?)").run(
      token,
      sha256Hex(ip).slice(0, 16),
      nowIso(),
      nowIso()
    );
    track("demo_start", { anonId: token.slice(0, 8) });
  } else {
    const row = db.prepare("SELECT questions_used FROM demo_sessions WHERE token = ?").get(token) as
      | { questions_used: number }
      | undefined;
    if (!row) {
      db.prepare("INSERT INTO demo_sessions (token, ip_hash, questions_used, created_at, last_at) VALUES (?, ?, 0, ?, ?)").run(
        token,
        sha256Hex(ip).slice(0, 16),
        nowIso(),
        nowIso()
      );
    } else {
      used = row.questions_used;
    }
  }

  if (used >= DEMO_LIMITS.questionsPerSession) {
    jar.set(DEMO_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 });
    return fail("quota_exceeded", 429);
  }

  const result = runDemoAnswer(question, () => undefined);
  db.prepare("UPDATE demo_sessions SET questions_used = questions_used + 1, last_at = ? WHERE token = ?").run(
    nowIso(),
    token
  );
  jar.set(DEMO_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 });
  track("demo_answer", { anonId: token.slice(0, 8), props: { status: result.status ?? "complete" } });

  return ok({
    answer: result.answer,
    status: result.status,
    citations: result.citations,
    remaining: DEMO_LIMITS.questionsPerSession - used - 1,
  });
}
