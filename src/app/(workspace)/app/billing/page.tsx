import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/data-access";
import { currentUser } from "@/lib/auth";
import { dict, type Locale } from "@/lib/i18n";
import { getDb } from "@/lib/db";
import { PLANS, formatHkd } from "@/lib/plans";
import { formatDate } from "@/lib/util";
import BillingClient, { type EventRow } from "@/components/billing-client";
import CancelResumeButtons from "@/components/billing-cancel-resume";

export default async function BillingPage() {
  const guard = await requireOrgContext("member");
  if (!guard.ok) redirect("/app");
  const { ctx } = guard;
  const user = await currentUser();
  const locale: Locale = user?.locale ?? "en";
  const t = dict(locale);
  const b = t.app.billing;
  const zh = locale === "zh-hant";
  const ent = ctx.entitlements;
  const sub = getDb().prepare("SELECT * FROM subscriptions WHERE org_id = ?").get(ctx.orgId) as {
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: number;
    grace_ends_at: string | null;
    read_only_until: string | null;
  };

  const invoices = getDb()
    .prepare("SELECT * FROM invoices WHERE org_id = ? ORDER BY created_at DESC LIMIT 12")
    .all(ctx.orgId) as Array<{
    number: string;
    amount_hkd: number;
    kind: string;
    status: string;
    created_at: string;
  }>;

  const events = getDb()
    .prepare("SELECT event_id, type, status, result, created_at FROM billing_events WHERE org_id = ? ORDER BY created_at DESC LIMIT 10")
    .all(ctx.orgId) as Array<{ event_id: string; type: string; status: string; result: string | null; created_at: string }>;

  const isPaid = ["active", "cancel_at_period_end", "past_due"].includes(sub.status);

  return (
    <div>
      <section className="mx-auto max-w-4xl px-4 pt-10 sm:px-8">
        <div className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{b.currentPlan}</p>
              <h1 className="mt-1 text-2xl font-bold text-navy-900">{zh ? PLANS[ent.plan].nameZh : PLANS[ent.plan].nameEn}</h1>
              <p className="mt-2 text-sm text-ink-700">
                <strong>{b.statusLabel}:</strong> {b.statuses[sub.status as keyof typeof b.statuses]}
              </p>
            </div>
            {ent.plan === "trial" && (
              <span className="rounded-full bg-accent-500/10 px-3 py-1 text-sm font-semibold text-accent-600">
                {t.pricing.planTrialTagline}
              </span>
            )}
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            {sub.current_period_start && sub.current_period_end && (
              <div>
                <dt className="text-ink-500">{b.periodLabel}</dt>
                <dd className="font-semibold text-ink-900">{formatDate(sub.current_period_start, locale)} → {formatDate(sub.current_period_end, locale)}</dd>
              </div>
            )}
            {sub.status === "cancel_at_period_end" && sub.current_period_end && (
              <div>
                <dt className="text-ink-500">{b.endsLabel}</dt>
                <dd className="font-semibold text-amber-700">{formatDate(sub.current_period_end, locale)}</dd>
              </div>
            )}
            {sub.grace_ends_at && (
              <div>
                <dt className="text-ink-500">{b.graceEndsLabel}</dt>
                <dd className="font-semibold text-amber-700">{formatDate(sub.grace_ends_at, locale)}</dd>
              </div>
            )}
            {sub.read_only_until && (
              <div>
                <dt className="text-ink-500">{b.readOnlyUntilLabel}</dt>
                <dd className="font-semibold text-ink-900">{formatDate(sub.read_only_until, locale)}</dd>
              </div>
            )}
            <div>
              <dt className="text-ink-500">{t.app.usage.allowanceTitle}</dt>
              <dd className="font-semibold text-ink-900">{ent.used} / {ent.allowance}</dd>
            </div>
          </dl>
          {ctx.role === "owner" && isPaid && (
            <div className="mt-6 border-t border-line pt-5">
              <h2 className="text-sm font-bold text-navy-900">{b.cancelTitle}</h2>
              <p className="mt-1 text-xs text-ink-500">{b.cancelNote}</p>
              <div className="mt-3">
                <CancelResumeButtons
                  cancelling={sub.cancel_at_period_end === 1}
                  labels={{ cancel: b.cancelCta, resume: b.resumeCta, busy: t.common.loading }}
                />
              </div>
            </div>
          )}
        </div>

        {invoices.length > 0 && (
          <div className="card mt-6 overflow-x-auto p-6">
            <h2 className="font-bold text-navy-900">{b.invoicesTitle}</h2>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-500">
                  <th className="py-2 pr-4 font-semibold">{b.invoiceNumber}</th>
                  <th className="py-2 pr-4 font-semibold">{b.invoiceKind}</th>
                  <th className="py-2 pr-4 font-semibold">{b.invoiceAmount}</th>
                  <th className="py-2 font-semibold">{b.invoiceDate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((inv) => (
                  <tr key={inv.number}>
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-900">{inv.number}</td>
                    <td className="py-2.5 pr-4 text-ink-700">{b.kinds[inv.kind as keyof typeof b.kinds] ?? inv.kind}</td>
                    <td className="py-2.5 pr-4 font-semibold text-ink-900">{formatHkd(inv.amount_hkd)}</td>
                    <td className="py-2.5 text-xs text-ink-500">{formatDate(inv.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <BillingClient
        locale={locale}
        isOwner={ctx.role === "owner"}
        planId={ent.plan}
        canBuyStarter={ent.plan !== "starter"}
        canBuyTeam={ent.plan !== "team"}
        checkoutTemplate={[
          {
            id: "starter",
            name: zh ? PLANS.starter.nameZh : PLANS.starter.nameEn,
            price: PLANS.starter.priceHkd,
            monthly: PLANS.starter.priceHkd,
            disabled: false,
            current: ent.plan === "starter",
          },
          {
            id: "team",
            name: zh ? PLANS.team.nameZh : PLANS.team.nameEn,
            price: PLANS.team.priceHkd,
            monthly: PLANS.team.priceHkd,
            disabled: false,
            current: ent.plan === "team",
          },
        ]}
        events={events as EventRow[]}
      />
    </div>
  );
}
