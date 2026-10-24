import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/data-access";
import { currentUser } from "@/lib/auth";
import { dict, type Locale } from "@/lib/i18n";
import { getDb } from "@/lib/db";
import { formatDateTime, pct } from "@/lib/util";

export default async function UsagePage() {
  const guard = await requireOrgContext("member");
  if (!guard.ok) redirect("/app");
  const { ctx } = guard;
  const user = await currentUser();
  const locale: Locale = user?.locale ?? "en";
  const t = dict(locale);
  const u = t.app.usage;
  const ent = ctx.entitlements;

  const ledger = getDb()
    .prepare(
      `SELECT request_id, state, reason, created_at FROM usage_reservations
       WHERE org_id = ? AND is_demo = 0 ORDER BY created_at DESC LIMIT 25`
    )
    .all(ctx.orgId) as Array<{ request_id: string; state: string; reason: string | null; created_at: string }>;

  const inFlight = getDb()
    .prepare("SELECT COUNT(*) AS n FROM usage_reservations WHERE org_id = ? AND state = 'reserved' AND is_demo = 0")
    .get(ctx.orgId) as { n: number };

  const csvRows = [
    "request_id,state,reason,created_at",
    ...ledger.map((r) => `${r.request_id},${r.state},${(r.reason ?? "").replace(/,/g, ";")},${r.created_at}`),
  ].join("\n");

  const stateLabels = u.states as Record<string, string>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-navy-900">{u.title}</h1>
      <p className="mt-1 text-sm text-ink-500">{u.subtitle}</p>

      <section className="card mt-8 p-6">
        <h2 className="font-bold text-navy-900">{u.allowanceTitle}</h2>
        <p className="mt-3 text-3xl font-bold text-navy-900">
          {ent.used}
          <span className="text-lg font-medium text-ink-500"> / {ent.allowance}</span>
        </p>
        <div className="mt-3 h-2.5 rounded-full bg-line" role="progressbar" aria-valuenow={pct(ent.used, ent.allowance)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2.5 rounded-full bg-accent-500 transition-all" style={{ width: `${pct(ent.used, ent.allowance)}%` }} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-ink-500">{u.used}</dt><dd className="font-semibold text-ink-900">{ent.used}</dd></div>
          <div><dt className="text-ink-500">{u.reserved}</dt><dd className="font-semibold text-ink-900">{ent.reserved}</dd></div>
          <div><dt className="text-ink-500">{u.remaining}</dt><dd className="font-semibold text-ink-900">{ent.remaining}</dd></div>
          <div><dt className="text-ink-500">{u.resetDate}</dt><dd className="font-semibold text-ink-900">{ent.resetDate ? ent.resetDate.slice(0, 10) : "—"}</dd></div>
        </dl>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-bold text-navy-900">{u.concurrencyTitle}</h2>
        <p className="mt-2 text-sm text-ink-700">
          {inFlight.n} {u.concurrencyUsed} · {t.pricing.concurrencyLabel}: {ent.limits.concurrency}
        </p>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-bold text-navy-900">{u.ledgerTitle}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-500">
                <th className="py-2 pr-4 font-semibold">{u.ledgerRequest}</th>
                <th className="py-2 pr-4 font-semibold">{u.ledgerState}</th>
                <th className="py-2 pr-4 font-semibold">{u.ledgerReason}</th>
                <th className="py-2 font-semibold">{u.ledgerWhen}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ledger.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-ink-500">{t.app.admin.noRecords}</td></tr>
              )}
              {ledger.map((r) => (
                <tr key={r.request_id}>
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink-700">{r.request_id.slice(0, 14)}…</td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.state === "settled" ? "bg-green-100 text-green-800" : r.state === "released" ? "bg-ink-300/30 text-ink-700" : "bg-amber-100 text-amber-800"}`}>
                      {stateLabels[r.state] ?? r.state}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-ink-500">{r.reason ?? "—"}</td>
                  <td className="py-2.5 text-xs text-ink-500">{formatDateTime(r.created_at, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvRows)}`}
          download="stargazer-usage-ledger.csv"
          className="btn-secondary mt-4"
        >
          {u.exportCta}
        </a>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold text-navy-900">{u.definitionTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{u.definitionBody}</p>
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-navy-900">{u.costTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{u.costBody}</p>
        </div>
      </section>
    </div>
  );
}
