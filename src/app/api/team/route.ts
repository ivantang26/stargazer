import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { requireOrgContext } from "@/lib/data-access";
import { inviteMember, transferOwnership } from "@/lib/org-service";
import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/util";
import { verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Role } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Team management (PRD §11): invitations, removal, role changes, ownership transfer. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const ctx = await requireOrgContext("admin");
  if (!ctx.ok) return fail(ctx.reason, ctx.reason === "forbidden" ? 403 : 401);
  const { ctx: c } = ctx;
  const body = await readJson<{
    action?: string;
    email?: string;
    role?: string;
    invitationId?: string;
    memberUserId?: string;
    toUserId?: string;
    password?: string;
  }>(req);
  const db = getDb();

  switch (body?.action) {
    case "invite": {
      const email = (body.email ?? "").trim().toLowerCase();
      const role: "admin" | "member" = body.role === "admin" ? "admin" : "member";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("bad_request", 400);
      const result = inviteMember(c.orgId, c.user.id, c.role, email, role);
      if (!result.ok) return fail(result.error ?? "bad_request", result.error === "seat_limit" ? 402 : 403);
      return ok({ invitationId: result.invitationId });
    }
    case "revoke_invitation": {
      if (!body.invitationId) return fail("bad_request", 400);
      const res = db
        .prepare("DELETE FROM invitations WHERE id = ? AND org_id = ? AND accepted_at IS NULL")
        .run(body.invitationId, c.orgId);
      return res.changes > 0 ? ok({ status: "revoked" }) : fail("not_found", 404);
    }
    case "remove_member": {
      if (!body.memberUserId) return fail("bad_request", 400);
      const member = db
        .prepare("SELECT role FROM memberships WHERE org_id = ? AND user_id = ?")
        .get(c.orgId, body.memberUserId) as { role: Role } | undefined;
      if (!member) return fail("not_found", 404);
      // The last owner cannot remove themselves without a valid transfer.
      if (member.role === "owner") return fail("forbidden", 403);
      if (c.role === "admin" && member.role === "admin") return fail("forbidden", 403);
      db.prepare("DELETE FROM memberships WHERE org_id = ? AND user_id = ?").run(c.orgId, body.memberUserId);
      // Membership changes take effect on subsequent protected requests.
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(body.memberUserId);
      audit({ actorUserId: c.user.id, orgId: c.orgId, action: "team.member_removed", scope: "team", result: "success" });
      return ok({ status: "removed" });
    }
    case "set_role": {
      if (!body.memberUserId || !body.role) return fail("bad_request", 400);
      if (c.role !== "owner") return fail("forbidden", 403);
      if (!["admin", "member"].includes(body.role)) return fail("bad_request", 400);
      const res = db
        .prepare("UPDATE memberships SET role = ? WHERE org_id = ? AND user_id = ? AND role != 'owner'")
        .run(body.role, c.orgId, body.memberUserId);
      audit({ actorUserId: c.user.id, orgId: c.orgId, action: "team.role_changed", scope: "team", result: "success", detail: { role: body.role } });
      return res.changes > 0 ? ok({ status: "updated" }) : fail("not_found", 404);
    }
    case "transfer_ownership": {
      if (c.role !== "owner") return fail("forbidden", 403);
      if (!body.toUserId) return fail("bad_request", 400);
      // Reauthentication: ownership transfer requires the owner's password.
      const owner = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(c.user.id) as { password_hash: string };
      if (!body.password || !verifyPassword(body.password, owner.password_hash)) {
        return fail("invalid_credentials", 403);
      }
      const done = transferOwnership(c.orgId, c.user.id, body.toUserId);
      return done ? ok({ status: "transferred" }) : fail("bad_request", 400);
    }
    case "touch": {
      // no-op used by the UI to re-verify access after membership changes
      return ok({ role: c.role, at: nowIso() });
    }
    default:
      return fail("bad_request", 400);
  }
}
