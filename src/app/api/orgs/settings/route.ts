import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { getDb } from "@/lib/db";
import { clampString, nowIso, newId } from "@/lib/util";
import { audit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth";
import { requestOrganizationDeletion } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Workspace settings mutations: rename, onboarding progress, deletion workflow. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("owner");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const { ctx: c } = ctx;
  const body = await readJson<{
    action?: string;
    name?: string;
    step?: string;
    password?: string;
  }>(req);
  const db = getDb();

  switch (body?.action) {
    case "rename": {
      const name = clampString(body.name, 120);
      if (!name) return fail("bad_request", 400);
      db.prepare("UPDATE organizations SET name = ? WHERE id = ?").run(name, c.orgId);
      audit({ actorUserId: c.user.id, orgId: c.orgId, action: "org.renamed", scope: "organization", result: "success" });
      return ok({ name });
    }
    case "onboarding_step": {
      const valid = ["naming", "visibility", "upload", "processing", "first_question", "done"];
      const step = valid.includes(body.step ?? "") ? body.step! : null;
      if (!step) return fail("bad_request", 400);
      db.prepare("UPDATE organizations SET onboarding_step = ? WHERE id = ?").run(step, c.orgId);
      return ok({ step });
    }
    case "delete": {
      // Reauthentication required (PRD §11): confirm the owner's password.
      const owner = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(c.user.id) as {
        password_hash: string;
      };
      if (!body.password || !verifyPassword(body.password, owner.password_hash)) {
        audit({ actorUserId: c.user.id, orgId: c.orgId, action: "org.deletion_denied", scope: "organization", result: "denied" });
        return fail("invalid_credentials", 403);
      }
      requestOrganizationDeletion(c.orgId, c.user.id);
      return ok({ status: "deletion_started" });
    }
    default:
      return fail("bad_request", 400);
  }
}
