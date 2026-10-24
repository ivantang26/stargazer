import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fail, readJson, sameOrigin } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { acceptInvitation } from "@/lib/org-service";

export const dynamic = "force-dynamic";

/** Invitation acceptance: single-use, email-bound, capacity-checked (PRD §11). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const body = await readJson<{ token?: string }>(req);
  if (!body?.token) return fail("bad_request", 400);
  const user = await currentUser();
  if (!user || !user.emailVerified) {
    return fail("unauthenticated", 401);
  }
  const result = acceptInvitation(body.token, user.id, user.email);
  if (!result.ok) {
    const code = result.error === "expired" ? "expired"
      : result.error === "already_accepted" ? "already_accepted"
      : result.error === "email_mismatch" ? "email_mismatch"
      : result.error === "seat_limit" ? "seat_limit"
      : "not_found";
    return fail(code, 400);
  }
  const res = NextResponse.json({ ok: true, orgId: result.orgId });
  res.cookies.set("sg_org", result.orgId, { httpOnly: false, sameSite: "lax", path: "/", maxAge: 86400 * 30 });
  return res;
}
