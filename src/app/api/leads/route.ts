import { NextRequest } from "next/server";
import { ok, fail, rateLimit, clientIp, readJson, sameOrigin } from "@/lib/http";
import { ensureSeeded, getDb } from "@/lib/db";
import { clampString, isEmail, newId, nowIso } from "@/lib/util";
import { track } from "@/lib/audit";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Contact form (PRD §8.4): stores the enquiry with a reference number. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  await ensureSeeded();
  if (!rateLimit(`lead:${clientIp(req)}`, 8, 3_600_000)) return fail("rate_limited", 429);

  const body = await readJson<Record<string, unknown>>(req);
  const name = clampString(body?.name, 120);
  const email = clampString(body?.email, 200).toLowerCase();
  const orgName = clampString(body?.orgName, 160);
  const enquiryType = clampString(body?.enquiryType, 60);
  const message = clampString(body?.message, 4000);
  if (!name || !isEmail(email) || !enquiryType || !message) return fail("bad_request", 400);

  const reference = `SG-${newId("").slice(0, 6).toUpperCase()}`;
  getDb()
    .prepare(
      `INSERT INTO leads (id, reference, name, email, org_name, enquiry_type, message, team_size, doc_volume,
         marketing_consent, locale, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`
    )
    .run(
      newId("lead"),
      reference,
      name,
      email,
      orgName,
      enquiryType,
      message,
      clampString(body?.teamSize, 40) || null,
      clampString(body?.docVolume, 40) || null,
      body?.marketingConsent ? 1 : 0,
      isLocale(String(body?.locale ?? "")) ? String(body?.locale) : "en",
      nowIso()
    );
  track("lead_submitted", { props: { type: enquiryType } });
  return ok({ reference });
}
