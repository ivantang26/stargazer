"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dict, type Locale } from "@/lib/i18n";

/** First-run workspace creation (PRD §9.2): name it and the trial starts. */
export default function CreateWorkspace({ locale, userName }: { locale: Locale; userName: string }) {
  const t = dict(locale);
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The gold dialog on the homepage may have carried a typed name and
  // language through sign-up; pick them up here.
  useEffect(() => {
    try {
      const carried = sessionStorage.getItem("sg_ws_name");
      const carriedLocale = sessionStorage.getItem("sg_ws_locale");
      if (carried) setName(carried);
      if (carriedLocale && carriedLocale !== locale) {
        sessionStorage.removeItem("sg_ws_locale");
        router.push(`/${carriedLocale}/verify`);
        router.refresh();
      }
    } catch {
      // storage unavailable
    }
  }, [locale, router]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? "conflict");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-3xl font-bold text-navy-900">
        {t.app.dashboard.welcome}{userName ? `, ${userName}` : ""}
      </h1>
      <p className="mt-2 text-ink-700">{t.app.dashboard.onboardingTitle}</p>
      <form onSubmit={create} className="card mt-8 space-y-5 p-7">
        <div>
          <label htmlFor="ws-name" className="label">{t.app.dashboard.stepNaming}</label>
          <input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            maxLength={120}
            placeholder={locale === "zh-hant" ? "例如：星光貿易" : "e.g. Northlight Trading"}
            required
          />
        </div>
        <div className="rounded-xl border border-line bg-paper p-4 text-sm text-ink-700">
          <p className="font-semibold text-navy-900">{t.pricing.planTrialTagline}</p>
          <p className="mt-1">{t.pricing.planTrialNote}</p>
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {(t.errors as Record<string, string>)[error] ?? t.errors.bad_request}
          </p>
        )}
        <button type="submit" disabled={busy || !name.trim()} className="btn-primary w-full">
          {busy ? t.common.loading : t.common.continue}
        </button>
      </form>
    </div>
  );
}
