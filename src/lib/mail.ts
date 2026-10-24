/**
 * Simulated email delivery (PRD §9.2: "email delivery monitoring").
 *
 * No SMTP provider is configured in this build; outgoing messages are recorded
 * in an outbox table and rendered at /dev/outbox for verification links,
 * invitations, and lifecycle notices. Swapping in a real provider means
 * replacing send() alone.
 */
import { getDb } from "./db";
import { newId, nowIso } from "./util";

export interface MailPayload {
  to: string;
  kind: string;
  subject: string;
  body: string;
  link?: string;
  locale?: "en" | "zh-hant";
}

export function send(p: MailPayload): string {
  const id = newId("eml");
  getDb()
    .prepare(
      `INSERT INTO emails (id, to_email, kind, subject, body_text, link, locale, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, p.to, p.kind, p.subject, p.body, p.link ?? null, p.locale ?? "en", nowIso());
  return id;
}
