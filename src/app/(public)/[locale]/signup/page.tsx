import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dict, isLocale, type Locale } from "@/lib/i18n";
import { AuthCard } from "@/components/auth-card";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create your account — Stargazer", robots: { index: false } };

export default async function SignUpPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  return (
    <AuthCard locale={locale} title={t.auth.signupTitle} subtitle={t.auth.signupSubtitle}>
      <SignUpForm locale={locale} />
    </AuthCard>
  );
}
