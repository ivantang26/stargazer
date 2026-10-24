import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { dict, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/auth-card";
import { currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Verify your email — Stargazer", robots: { index: false } };

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { status?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const user = await currentUser();
  if (!user) redirect(`/${locale}/signin`);

  if (searchParams.status === "ok" || user.emailVerified) {
    return (
      <AuthCard locale={locale} title={t.auth.verifySuccessTitle} subtitle={t.auth.verifySuccessBody}>
        <Link href="/app" className="btn-primary w-full">{t.auth.verifyContinue}</Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard locale={locale} title={t.auth.verifyTitle} subtitle={t.auth.verifyBody}>
      <Link href="/dev/outbox" className="btn-secondary w-full" target="_blank">
        {t.auth.verifyOutboxLink}
      </Link>
      <p className="mt-4 text-center text-xs text-[var(--muted)]">{t.auth.devNote}</p>
    </AuthCard>
  );
}
