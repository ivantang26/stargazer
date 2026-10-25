import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import PageHero from "@/components/public/page-hero";
import DocLayout from "@/components/public/doc-layout";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.privacy.metaTitle, description: t.privacy.metaDescription, alternates: alternatesFor("/privacy") };
}

/** Privacy notice: the data inventory as a real table first, then the notice text. */
export default async function PrivacyPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  const inv = t.privacy.inventory;
  const invKeys: Array<[keyof (typeof inv)[number], string]> = [
    ["category", t.privacy.colCategory],
    ["purpose", t.privacy.colPurpose],
    ["recipients", t.privacy.colRecipients],
    ["retention", t.privacy.colRetention],
    ["deletion", t.privacy.colDeletion],
  ];
  return (
    <div>
      <PageHero
        title={t.privacy.title}
        sub={t.privacy.metaDescription}
        meta={t.privacy.updated}
        actions={
          <>
            <Link href={p("/contact")} className="ps-action">{t.about.contactCta}</Link>
            <Link href={p("/security")} className="ps-secondary">{t.nav.security}</Link>
          </>
        }
      />

      <section className="ps-container pb-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-ps-ink">{t.privacy.inventoryTitle}</h2>
        <div className="overflow-x-auto rounded-[var(--r-lg)] border border-ps-line bg-ps-surface">
          <table className="doctable min-w-[760px]">
            <thead>
              <tr>
                {invKeys.map(([, label]) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inv.map((row) => (
                <tr key={row.category}>
                  {invKeys.map(([key]) => (
                    <td key={key}>{row[key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DocLayout
        tocTitle={locale === "zh-hant" ? "目錄" : "Contents"}
        intro={<p className="!mb-2">{t.privacy.intro}</p>}
        sections={[
          { title: t.privacy.noTrainingTitle, body: t.privacy.noTrainingBody },
          { title: t.privacy.rightsTitle, body: t.privacy.rightsBody },
        ]}
      />
    </div>
  );
}
