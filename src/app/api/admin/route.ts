import { NextRequest } from "next/server";
import { ok, fail, readJson, sameOrigin } from "@/lib/http";
import { currentUser } from "@/lib/auth";
import { getDb, setSetting, getSetting } from "@/lib/db";
import { clampString, newId, nowIso } from "@/lib/util";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const LEAD_STATUSES = ["new", "assigned", "contacted", "qualified", "closed", "declined"];
const FLAGS = ["generation_enabled", "demo_enabled"];

async function requireStaff() {
  const user = await currentUser();
  if (!user || !user.isStaff) return null;
  return user;
}

/** Platform administration (PRD §13): leads queue, feature flags. Staff-authenticated. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const staff = await requireStaff();
  if (!staff) return fail("forbidden", 403);
  const body = await readJson<{ action?: string; leadId?: string; status?: string; flag?: string; value?: string }>(req);
  const db = getDb();

  switch (body?.action) {
    case "set_lead_status": {
      if (!body.leadId || !LEAD_STATUSES.includes(body.status ?? "")) return fail("bad_request", 400);
      const res = db
        .prepare("UPDATE leads SET status = ? WHERE id = ?")
        .run(body.status!, body.leadId);
      audit({ actorUserId: staff.id, action: "admin.lead_status", scope: "support", result: "success", detail: { leadId: body.leadId, status: body.status } });
      return res.changes > 0 ? ok({ status: "updated" }) : fail("not_found", 404);
    }
    case "set_flag": {
      if (!body.flag || !FLAGS.includes(body.flag) || !["true", "false"].includes(body.value ?? "")) {
        return fail("bad_request", 400);
      }
      setSetting(body.flag, body.value!);
      audit({ actorUserId: staff.id, action: "admin.flag_changed", scope: "platform", result: "success", detail: { flag: body.flag, value: body.value } });
      return ok({ flag: body.flag, value: getSetting(body.flag) });
    }
    case "create_staff": {
      // Bootstrap utility: promote an existing verified account to staff.
      const email = clampString((body as { email?: string }).email, 200).toLowerCase();
      const res = db.prepare("UPDATE users SET is_staff = 1 WHERE email = ? AND email_verified_at IS NOT NULL").run(email);
      audit({ actorUserId: staff.id, action: "admin.staff_created", scope: "platform", result: res.changes > 0 ? "success" : "error", detail: {} });
      return res.changes > 0 ? ok({ status: "promoted" }) : fail("not_found", 404);
    }
    default:
      return fail("bad_request", 400);
  }
}
