import type { Metadata } from "next";
import Link from "next/link";
import { getDb, ensureSeeded } from "@/lib/db";
import { formatDateTime } from "@/lib/util";

export const metadata: Metadata = { title: "Development outbox | Stargazer", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Development-only simulated mailbox. In this local build no SMTP provider is
 * configured, so verification links, invitations, and lifecycle notices land
 * here. This page must not exist in a production deployment with real email.
 */
export default async function DevOutboxPage() {
  await ensureSeeded();
  const emails = getDb()
    .prepare("SELECT * FROM emails ORDER BY created_at DESC LIMIT 50")
    .all() as Array<{
    id: string;
    to_email: string;
    kind: string;
    subject: string;
    body_text: string;
    link: string | null;
    locale: string;
    created_at: string;
  }>;
  return (
    <div className="w-full max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-navy-900">Development outbox</h1>
      <p className="mt-2 text-sm text-ink-700">
        Simulated emails land here in this local build (verification, invitations, billing notices). Replace{" "}
        <code className="rounded bg-paper px-1">send()</code> in <code className="rounded bg-paper px-1">src/lib/mail.ts</code> with a real provider for production.
      </p>
      <div className="mt-6 space-y-3">
        {emails.length === 0 && <p className="text-sm text-ink-500">No messages yet.</p>}
        {emails.map((e) => (
          <div key={e.id} className="card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold text-navy-900">{e.subject}</p>
              <p className="text-xs text-ink-500">{formatDateTime(e.created_at, e.locale === "zh-hant" ? "zh-hant" : "en")}</p>
            </div>
            <p className="mt-0.5 text-xs text-ink-500">To: {e.to_email} · kind: {e.kind}</p>
            <p className="mt-2 text-sm text-ink-700">{e.body_text}</p>
            {e.link && (
              <Link href={e.link} className="btn-secondary mt-3 !px-3 !py-1.5 text-xs">
                {e.link.startsWith("/api") ? "Verify now" : "Open link"}
              </Link>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <Link href="/en" className="btn-secondary">← Website</Link>
        <Link href="/app" className="btn-secondary">Workspace →</Link>
      </div>
    </div>
  );
}
