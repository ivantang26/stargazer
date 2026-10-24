import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { createOrganization } from "@/lib/org-service";
import { getDb } from "@/lib/db";
import { userWorkspaces } from "@/lib/data-access";
import { clampString } from "@/lib/util";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Create a workspace: requires a verified user; trial starts here (PRD §9.2). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("unauthenticated", 401);
  if (!user.emailVerified) return fail("unverified", 403);
  const body = await readJson<{ name?: string }>(req);
  const name = clampString(body?.name, 120);
  if (!name) return fail("bad_request", 400);

  const existing = getDb()
    .prepare("SELECT COUNT(*) AS n FROM memberships m JOIN organizations o ON o.id = m.org_id WHERE m.user_id = ? AND o.deletion_status IS NULL")
    .get(user.id) as { n: number };
  // One active workspace per user keeps the MVP journey simple; invitation
  // membership into other organizations is unaffected.
  if (existing.n > 0) return fail("conflict", 409);

  const orgId = createOrganization(user.id, name, user.email, user.locale);
  audit({ actorUserId: user.id, orgId, action: "org.created", scope: "organization", result: "success" });
  return ok({ orgId });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("unauthenticated", 401);
  return ok({ workspaces: userWorkspaces(user.id) });
}
