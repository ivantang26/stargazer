import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dict, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/auth-card";
import { ResetForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Choose a new password — Stargazer", robots: { index: false } };

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { token?: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  return (
    <AuthCard locale={locale} title={t.auth.resetTitle} subtitle={t.auth.passwordHint}>
      <ResetForm locale={locale} token={searchParams.token ?? ""} />
    </AuthCard>
  );
}
