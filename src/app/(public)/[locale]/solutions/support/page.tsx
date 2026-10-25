import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import WorkflowPage from "@/components/public/workflow";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.solutionsSupport.metaTitle, description: t.solutionsSupport.metaDescription, alternates: alternatesFor("/solutions/support") };
}

export default async function SupportSolutionPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  return <WorkflowPage locale={locale} s={dict(locale).solutionsSupport} />;
}
