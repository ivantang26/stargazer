import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import PageHero from "@/components/public/page-hero";
import DocLayout from "@/components/public/doc-layout";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.security.metaTitle, description: t.security.metaDescription, alternates: alternatesFor("/security") };
}

export default async function SecurityPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  return (
    <div>
      <PageHero
        title={t.security.title}
        sub={t.security.subtitle}
        actions={
          <>
            <Link href={p("/contact")} className="ps-action">{t.about.contactCta}</Link>
            <Link href={p("/privacy")} className="ps-secondary">{t.nav.privacy}</Link>
          </>
        }
      />
      <DocLayout tocTitle={t.security.controlsTitle} sections={t.security.sections} />
    </div>
  );
}
