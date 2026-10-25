"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dict, type Locale } from "@/lib/i18n";

function Err({ locale, code }: { locale: Locale; code: string }) {
  const t = dict(locale);
  const known = code && (t.errors as Record<string, string>)[code];
  return (
    <p className="rounded-[var(--r-sm)] bg-ps-danger-soft px-4 py-3 text-sm text-ps-danger" role="alert">
      {known ?? t.errors.bad_request}
    </p>
  );
}

export function SignInForm({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string; verified?: boolean };
        setBusy(false);
        if (!data.ok) {
          setError(data.error ?? "invalid_credentials");
          return;
        }
        router.push(data.verified ? "/app" : `/${locale}/verify`);
        router.refresh();
      }}
    >
      <div>
        <label htmlFor="si-email" className="label">{t.auth.emailLabel}</label>
        <input id="si-email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label htmlFor="si-pw" className="label">{t.auth.passwordLabel}</label>
        <input id="si-pw" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      {error && <Err locale={locale} code={error} />}
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? t.common.loading : t.auth.signinCta}</button>
      <div className="flex items-center justify-between text-[15px]">
        <Link href={`/${locale}/forgot`} className="font-medium text-[var(--ink)] underline decoration-1 underline-offset-4 hover:text-[var(--accent)]">{t.auth.forgotLink}</Link>
        <span className="text-[var(--muted)]">
          {t.auth.noAccount}{" "}
          <Link href={`/${locale}/signup`} className="font-semibold text-[var(--ink)] underline decoration-1 underline-offset-4 hover:text-[var(--accent)]">{t.auth.signupCta}</Link>
        </span>
      </div>
    </form>
  );
}

export function SignUpForm({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-5" data-reveal
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: fd.get("email"),
            password: fd.get("password"),
            name: fd.get("name"),
            locale,
            acceptedTerms: fd.get("terms") === "on",
          }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        setBusy(false);
        if (!data.ok) {
          setError(data.error ?? "bad_request");
          return;
        }
        router.push(`/${locale}/verify`);
        router.refresh();
      }}
    >
      <div>
        <label htmlFor="su-name" className="label">{t.auth.nameLabel}</label>
        <input id="su-name" name="name" required maxLength={120} className="input" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="su-email" className="label">{t.auth.emailLabel}</label>
        <input id="su-email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label htmlFor="su-pw" className="label">{t.auth.passwordLabel}</label>
        <input id="su-pw" name="password" type="password" required minLength={10} autoComplete="new-password" className="input" />
        <p className="mt-1.5 text-[13px] text-[var(--muted)]">{t.auth.passwordHint}</p>
      </div>
      <div>
        <label htmlFor="su-locale" className="label">{t.auth.languageLabel}</label>
        <select id="su-locale" name="locale" defaultValue={locale} className="input">
          <option value="en">English</option>
          <option value="zh-hant">繁體中文</option>
        </select>
      </div>
      <label className="flex items-start gap-3 text-[15px] text-[var(--muted)]">
        <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 rounded border-[var(--surface-2)] text-accent-600" />
        <span>
          {t.auth.termsLabel}{" "}
          <Link href={`/${locale}/terms`} className="font-medium text-[var(--ink)] underline decoration-1 underline-offset-4 hover:text-[var(--accent)]" target="_blank">{t.nav.terms}</Link> ·{" "}
          <Link href={`/${locale}/privacy`} className="font-medium text-[var(--ink)] underline decoration-1 underline-offset-4 hover:text-[var(--accent)]" target="_blank">{t.nav.privacy}</Link>
        </span>
      </label>
      {error && <Err locale={locale} code={error} />}
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? t.common.loading : t.auth.signupCta}</button>
      <p className="text-center text-[15px] text-[var(--muted)]">
        {t.auth.haveAccount}{" "}
        <Link href={`/${locale}/signin`} className="font-semibold text-[var(--ink)] underline decoration-1 underline-offset-4 hover:text-[var(--accent)]">{t.auth.signinCta}</Link>
      </p>
    </form>
  );
}

export function ForgotForm({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const [state, setState] = useState<"idle" | "sent">("idle");
  const [busy, setBusy] = useState(false);
  if (state === "sent") {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-6">
        <h2 className="text-[22px] font-semibold text-[var(--ink)]">{t.auth.forgotSentTitle}</h2>
        <p className="mt-2 text-[16px] text-[var(--muted)]">{t.auth.forgotSentBody}</p>
        <p className="mt-3 text-[13px] text-[var(--muted)]">{t.auth.devNote}</p>
      </div>
    );
  }
  return (
    <form
      className="space-y-5" data-reveal
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        await fetch("/api/auth/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: fd.get("email") }),
        });
        setBusy(false);
        setState("sent");
      }}
    >
      <div>
        <label htmlFor="fg-email" className="label">{t.auth.emailLabel}</label>
        <input id="fg-email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? t.common.loading : t.auth.forgotCta}</button>
    </form>
  );
}

export function ResetForm({ locale, token }: { locale: Locale; token: string }) {
  const t = dict(locale);
  const [state, setState] = useState<"idle" | "done">("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (state === "done") {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-6">
        <p className="text-[16px] font-medium text-[var(--ink)]">{t.auth.resetDone}</p>
        <Link href={`/${locale}/signin`} className="btn-primary mt-4">{t.auth.signinCta}</Link>
      </div>
    );
  }
  return (
    <form
      className="space-y-5" data-reveal
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        const res = await fetch("/api/auth/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: fd.get("password") }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        setBusy(false);
        if (!data.ok) {
          setError(data.error ?? "bad_request");
          return;
        }
        setState("done");
      }}
    >
      <div>
        <label htmlFor="rs-pw" className="label">{t.auth.newPassword}</label>
        <input id="rs-pw" name="password" type="password" required minLength={10} autoComplete="new-password" className="input" />
        <p className="mt-1.5 text-[13px] text-[var(--muted)]">{t.auth.passwordHint}</p>
      </div>
      {error && <Err locale={locale} code={error} />}
      <button type="submit" disabled={busy || !token} className="btn-primary w-full">{busy ? t.common.loading : t.auth.resetCta}</button>
    </form>
  );
}
