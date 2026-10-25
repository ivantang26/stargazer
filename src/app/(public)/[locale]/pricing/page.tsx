import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import { ALL_PLANS } from "@/lib/plans";
import PageHero from "@/components/public/page-hero";
import PricingStrip from "@/components/home/pricing-strip";
import Faq from "@/components/home/faq";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const t = dict(params.locale);
  return { title: t.pricing.metaTitle, description: t.pricing.metaDescription, alternates: alternatesFor("/pricing") };
}

/** Pricing: plan summary, the full comparison as a real table, then billing questions. */
export default async function PricingPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const currency = zh ? "港元" : "HKD";
  const plan = (id: string) => ALL_PLANS.find((x) => x.id === id)!;
  const rows: Array<[string, (id: string) => string | number]> = [
    [zh ? "月費" : "Monthly price", (id) => (id === "trial" ? (zh ? "免費十四天" : "Free for 14 days") : id === "business" ? (zh ? "另議" : "Quoted") : `${currency} ${plan(id).priceHkd.toLocaleString()}`)],
    [t.pricing.seatsLabel, (id) => plan(id).limits.seats || "-"],
    [t.pricing.answersLabel, (id) => (plan(id).limits.answers ? plan(id).limits.answers.toLocaleString() : "-")],
    [t.pricing.documentsLabel, (id) => plan(id).limits.documents || "-"],
    [t.pricing.storageLabel, (id) => { const mb = plan(id).limits.storageMb; return mb ? (mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`) : "-"; }],
    [t.pricing.concurrencyLabel, (id) => plan(id).limits.concurrency || "-"],
    [t.common.supportChannel, (id) => (id === "team" ? t.pricing.supportPriority : id === "business" ? t.pricing.supportNamed : t.pricing.supportEmail)],
  ];

  return (
    <div>
      <PageHero
        title={t.pricing.title}
        sub={t.pricing.subtitle}
        actions={
          <>
            <Link href={`/${locale}/signup`} className="ps-action">{t.pricing.trialCta}</Link>
            <Link href={`/${locale}/contact`} className="ps-secondary">{t.pricing.contactSales}</Link>
          </>
        }
      />

      <PricingStrip locale={locale} hideHeader />

      <section className="ps-container py-16 md:py-20">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-ps-ink md:text-3xl">{t.pricing.compareTitle}</h2>
        <div className="overflow-x-auto rounded-[var(--r-lg)] border border-ps-line bg-ps-surface">
          <table className="doctable min-w-[720px]">
            <thead>
              <tr>
                <th>
                  <span className="sr-only">{zh ? "項目" : "Item"}</span>
                </th>
                {ALL_PLANS.map((p) => (
                  <th key={p.id}>{zh ? p.nameZh : p.nameEn}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fn]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {ALL_PLANS.map((p) => (
                    <td key={p.id} className="[font-variant-numeric:tabular-nums]">{fn(p.id)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[70ch] text-[14px] text-ps-muted">{t.pricing.currencyNote}</p>
      </section>

      <Faq title={t.pricing.faqTitle} items={t.pricing.faq} footnote={t.pricing.cancellationNote} />
    </div>
  );
}
