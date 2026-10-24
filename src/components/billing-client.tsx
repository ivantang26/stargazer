"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";

export interface CheckoutInfo {
  id: string;
  planId: string;
  proratedCharge: number | null;
  monthlyAfter: number;
}

export interface EventRow {
  event_id: string;
  type: string;
  status: string;
  result: string | null;
  created_at: string;
}

export default function BillingClient({
  locale,
  isOwner,
  planId,
  canBuyStarter,
  canBuyTeam,
  checkoutTemplate,
  events,
}: {
  locale: Locale;
  isOwner: boolean;
  planId: string;
  canBuyStarter: boolean;
  canBuyTeam: boolean;
  checkoutTemplate: Array<{ id: string; name: string; price: number; monthly: number; disabled: boolean; current: boolean }>;
  events: EventRow[];
}) {
  const t = dict(locale);
  const b = t.app.billing;
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutInfo | null>(null);
  const [result, setResult] = useState<{ kind: "pending" | "failed" | "ok"; text?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as { ok: boolean; error?: string } & Record<string, unknown>;
  }

  async function startCheckout(plan: string) {
    setBusy(true);
    setResult(null);
    const data = (await call({ action: "checkout", plan })) as {
      ok: boolean;
      checkout?: { id: string; plan_id: string; prorated_charge_hkd: number | null };
    };
    setBusy(false);
    if (!data.ok || !data.checkout) return;
    setCheckout({
      id: data.checkout.id,
      planId: data.checkout.plan_id,
      proratedCharge: data.checkout.prorated_charge_hkd ?? null,
      monthlyAfter: 0,
    });
  }

  async function pay(outcome: "pay" | "fail" | "delay") {
    if (!checkout) return;
    setBusy(true);
    const data = (await call({ action: "simulate_payment", checkoutId: checkout.id, outcome })) as {
      ok: boolean;
      status?: string;
      message?: string;
    };
    setBusy(false);
    if (!data.ok) return;
    if (data.status === "payment_failed") setResult({ kind: "failed" });
    else if (data.status === "pending_confirmation") setResult({ kind: "pending" });
    else setResult({ kind: "ok" });
    setCheckout(null);
    setTimeout(() => router.refresh(), outcome === "pay" ? 1500 : 400);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-navy-900">{b.title}</h1>
      <p className="mt-1 text-sm text-ink-500">{b.subtitle}</p>

      {result?.kind === "pending" && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">{b.pendingTitle}</p>
          <p className="mt-1 text-sm text-amber-800">{b.pendingBody}</p>
          <p className="mt-2 text-xs text-amber-700">{b.delayedNote}</p>
        </div>
      )}
      {result?.kind === "failed" && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-800">{b.failedTitle}</p>
          <p className="mt-1 text-sm text-red-700">{b.failedBody}</p>
        </div>
      )}
      {result?.kind === "ok" && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="font-semibold text-green-800">✓ {b.entitlementNote}</p>
        </div>
      )}

      {checkout && (
        <div className="card mt-6 border-accent-500/40 p-6" role="dialog" aria-label={b.checkoutTitle}>
          <h2 className="font-bold text-navy-900">{b.checkoutTitle}</h2>
          <p className="mt-1 text-xs text-ink-500">{b.checkoutNote}</p>
          <div className="mt-4 rounded-xl border border-line bg-paper p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-ink-700">{b.proratedCharge}</span>
              <span className="font-bold text-navy-900">HKD {checkout.proratedCharge ?? 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-ink-700">{b.monthlyAfter}</span>
              <span className="font-semibold text-ink-900">HKD {checkout.planId === "team" ? 1499 : 499}</span>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={busy} onClick={() => void pay("pay")}>{b.payNow}</button>
            <button className="btn-secondary" disabled={busy} onClick={() => void pay("delay")}>{b.simulateDelay}</button>
            <button className="btn-secondary" disabled={busy} onClick={() => void pay("fail")}>{b.simulateFail}</button>
            <button className="btn-ghost" disabled={busy} onClick={() => setCheckout(null)}>{t.common.cancel}</button>
          </div>
        </div>
      )}

      {isOwner && (
        <section className="card mt-8 p-6">
          <h2 className="font-bold text-navy-900">{b.upgradeTitle}</h2>
          <p className="mt-1 text-xs text-ink-500">{b.upgradeNote}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {checkoutTemplate.map((plan) => (
              <div key={plan.id} className={`rounded-xl border p-5 ${plan.current ? "border-accent-500 bg-accent-500/5" : "border-line bg-paper"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-navy-900">{plan.name}</h3>
                  {plan.current && <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-xs font-semibold text-white">{b.currentTag}</span>}
                </div>
                <p className="mt-1 text-2xl font-bold text-navy-900">HKD {plan.price}<span className="text-sm font-medium text-ink-500">{t.common.perMonth}</span></p>
                <button
                  className={plan.current ? "btn-secondary mt-4 w-full" : "btn-primary mt-4 w-full"}
                  disabled={plan.disabled || plan.current || busy}
                  onClick={() => void startCheckout(plan.id)}
                >
                  {plan.current ? b.currentTag : `${b.choosePlan} ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-line bg-paper p-4">
            <h3 className="text-sm font-bold text-navy-900">{b.businessTitle}</h3>
            <p className="mt-1 text-xs text-ink-700">{b.businessBody}</p>
            <Link href={`/${locale}/contact`} className="btn-ghost mt-2 !px-0 text-accent-600 hover:!bg-transparent">{b.businessCta} →</Link>
          </div>
        </section>
      )}

      {isOwner && (
        <section className="card mt-6 p-6">
          <h2 className="font-bold text-navy-900">{b.paymentMethodTitle}</h2>
          <p className="mt-1 text-sm text-ink-700">{b.paymentMethodBody}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="btn-secondary"
              disabled={busy || planId === "trial"}
              onClick={async () => {
                setBusy(true);
                await call({ action: "simulate_renewal", outcome: "fail" });
                setBusy(false);
                router.refresh();
              }}
            >
              {b.simulateRenewFail}
            </button>
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await call({ action: "simulate_renewal", outcome: "paid" });
                setBusy(false);
                router.refresh();
              }}
            >
              {b.simulateRenewPaid}
            </button>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="font-bold text-navy-900">{b.webhookTitle}</h2>
          <p className="mt-1 text-xs text-ink-500">{b.webhookBody}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-500">
                  <th className="py-2 pr-4 font-semibold">{b.eventCol}</th>
                  <th className="py-2 pr-4 font-semibold">{b.typeCol}</th>
                  <th className="py-2 pr-4 font-semibold">{b.statusCol}</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((e) => (
                  <tr key={e.event_id}>
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-700">{e.event_id.slice(0, 16)}…</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-900">{e.type}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.status === "processed" ? "bg-green-100 text-green-800" : e.status === "ignored" ? "bg-ink-300/30 text-ink-700" : "bg-amber-100 text-amber-800"}`}>
                        {e.status}{e.result ? ` · ${e.result}` : ""}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {isOwner && e.status !== "received" && (
                        <button
                          className="btn-ghost !py-1 text-xs"
                          onClick={async () => {
                            await call({ action: "redeliver_event", eventId: e.event_id });
                            router.refresh();
                          }}
                        >
                          {b.redeliver}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
