import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import PageHero from "@/components/public/page-hero";
import DocLayout from "@/components/public/doc-layout";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.terms.metaTitle, description: t.terms.metaDescription, alternates: alternatesFor("/terms") };
}

export default async function TermsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  return (
    <div>
      <PageHero title={t.terms.title} sub={t.terms.metaDescription} meta={t.terms.updated} />
      <DocLayout tocTitle={locale === "zh-hant" ? "目錄" : "Contents"} sections={t.terms.sections} />
      <section className="ps-container pb-24">
        <div className="flex flex-col gap-4 rounded-[var(--r-lg)] border border-ps-line bg-ps-surface p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="text-lg font-semibold text-ps-ink">{t.about.contactTitle}</h2>
            <p className="mt-1 max-w-[60ch] text-[15px] text-ps-muted">{t.contact.nextBody}</p>
          </div>
          <Link href={p("/contact")} className="ps-action self-start md:self-auto">{t.about.contactCta}</Link>
        </div>
      </section>
    </div>
  );
}
