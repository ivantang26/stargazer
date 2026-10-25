"use client";

import { useState } from "react";
import { dict, type Locale } from "@/lib/i18n";

/**
 * The enquiry form on the reading ground: fields with their own conventions,
 * no card box, the reference number returned as the record it is.
 */
export default function ContactForm({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [reference, setReference] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          orgName: fd.get("orgName"),
          enquiryType: fd.get("enquiryType"),
          message: fd.get("message"),
          teamSize: fd.get("teamSize"),
          docVolume: fd.get("docVolume"),
          marketingConsent: marketing,
          locale,
          sourcePage: window.location.pathname,
        }),
      });
      const data = (await res.json()) as { ok: boolean; reference?: string; error?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setErrorMsg(data.error ?? "error");
        return;
      }
      setReference(data.reference ?? "");
      setState("done");
    } catch {
      setState("error");
      setErrorMsg("network");
    }
  }

  if (state === "done") {
    return (
      <div role="status">
        <h2 className="text-2xl font-semibold tracking-tight text-ps-ink">{t.contact.successTitle}</h2>
        <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-ps-ink">{t.contact.successBody}</p>
        <p className="mt-6 inline-block rounded-[var(--r-sm)] bg-ps-sunk px-4 py-3 font-mono text-[16px] text-ps-ink">
          {t.contact.referenceLabel}: {reference}
        </p>
        <p className="mt-4 text-[14px] text-ps-muted">
          {marketing ? t.contact.marketingYes : t.contact.marketingNo}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate={false}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="label">{t.contact.nameLabel} *</label>
          <input id="cf-name" name="name" required maxLength={120} className="input" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="cf-email" className="label">{t.contact.emailLabel} *</label>
          <input id="cf-email" name="email" type="email" required maxLength={200} className="input" autoComplete="email" />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-org" className="label">{t.contact.orgLabel}</label>
          <input id="cf-org" name="orgName" maxLength={160} className="input" autoComplete="organization" />
        </div>
        <div>
          <label htmlFor="cf-type" className="label">{t.contact.typeLabel} *</label>
          <select id="cf-type" name="enquiryType" required className="input">
            {t.contact.types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="cf-message" className="label">{t.contact.messageLabel} *</label>
        <textarea id="cf-message" name="message" required rows={5} maxLength={4000} className="input" placeholder={t.contact.messagePlaceholder} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-team" className="label">{t.contact.teamSizeLabel} ({t.common.optional})</label>
          <input id="cf-team" name="teamSize" className="input" placeholder="1–5, 6–20, 21+" />
        </div>
        <div>
          <label htmlFor="cf-vol" className="label">{t.contact.docVolumeLabel} ({t.common.optional})</label>
          <input id="cf-vol" name="docVolume" className="input" placeholder="10–50, 50–200, 200+" />
        </div>
      </div>
      <label className="flex items-start gap-3 text-[14.5px] text-ps-muted">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-ps-line accent-[var(--accent)]"
        />
        {t.contact.consentLabel}
      </label>
      {state === "error" && (
        <p role="alert" className="rounded-[var(--r-sm)] bg-ps-danger-soft px-4 py-3 text-[14.5px] text-ps-danger">
          {t.errors[errorMsg as keyof typeof t.errors] ?? t.errors.bad_request}
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="ps-action disabled:opacity-50">
        {state === "sending" ? t.common.loading : t.contact.submit}
      </button>
    </form>
  );
}
