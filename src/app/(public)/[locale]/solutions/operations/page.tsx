import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import WorkflowPage from "@/components/public/workflow";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.solutionsOps.metaTitle, description: t.solutionsOps.metaDescription, alternates: alternatesFor("/solutions/operations") };
}

export default async function OperationsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  return <WorkflowPage locale={locale} s={dict(locale).solutionsOps} />;
}
