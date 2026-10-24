import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dict, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/auth-card";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset your password — Stargazer", robots: { index: false } };

export default async function ForgotPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  return (
    <AuthCard locale={locale} title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
      <ForgotForm locale={locale} />
    </AuthCard>
  );
}
