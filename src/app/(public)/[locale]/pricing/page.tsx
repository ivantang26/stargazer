import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import { ALL_PLANS } from "@/lib/plans";
import Reveal from "@/components/home/reveal";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const t = dict(params.locale);
  return { title: t.pricing.metaTitle, description: t.pricing.metaDescription, alternates: alternatesFor("/pricing") };
}

/**
 * Prices like a menu: grouped rows, name left, price right on one baseline,
 * the whole plan stated under each, the observatory engraving beside the
 * heading. The comparison table stays a real table.
 */
export default async function PricingPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const currency = zh ? "港元" : "HKD";
  const planDetails: Record<string, string> = {
    trial: t.pricing.planTrialNote,
    starter: zh ? "1 席位 · 每期 500 答案 · 100 文件 · 1 GB · 電郵支援" : "1 seat · 500 answers a period · 100 documents · 1 GB · email support",
    team: zh ? "5 席位 · 每期 2,500 答案 · 500 文件 · 5 GB · 優先電郵支援" : "5 seats · 2,500 answers a period · 500 documents · 5 GB · priority email support",
    business: t.pricing.planBusinessNote,
  };

  return (
    <div>
      <Reveal />
      <section className="menu" style={{ paddingTop: 72 }}>
        <div>
          <h1 className="ps-h" data-reveal style={{ fontSize: "clamp(48px, 6vw, 104px)" }}>
            {t.pricing.title}
          </h1>
          <p data-reveal style={{ ["--reveal-delay" as string]: "70ms", fontSize: 18, lineHeight: 1.5, color: "var(--ink)", maxWidth: "44ch", marginTop: 26 }}>
            {t.pricing.subtitle}
          </p>
          <p className="menu__footnote" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            {t.pricing.currencyNote}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="menu__photo" style={{ maxWidth: 520 }}
            src="/assets/kitlv-51w12-spyk-j-van-der-observatoire.jpg"
            alt="Copper engraving of the Peking observatory, 1736"
            width={1920}
            height={1433}
            loading="lazy"
            data-reveal
          />
        </div>
        <div className="menu__groups">
          <div className="menu__group" data-reveal>
            <h2 className="menu__groupname">{t.home.pricingGroupTrial}</h2>
            <div className="menu__row">
              <span>{t.common.startTrial}</span>
              <b>{zh ? "免費" : "Free"}</b>
            </div>
            <p className="menu__desc">{planDetails.trial}</p>
            <Link href={`/${locale}/signup`} className="ps-action">{t.pricing.trialCta}</Link>
          </div>
          <div className="menu__group" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            <h2 className="menu__groupname">{t.home.pricingGroupPaid}</h2>
            <div className="menu__row">
              <span>Starter</span>
              <b>{currency} 499</b>
            </div>
            <p className="menu__desc">{planDetails.starter}</p>
            <div className="menu__row" style={{ marginTop: 26 }}>
              <span>Team</span>
              <b>{currency} 1,499</b>
            </div>
            <p className="menu__desc">{planDetails.team}</p>
          </div>
          <div className="menu__group" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <h2 className="menu__groupname">{t.home.pricingGroupQuoted}</h2>
            <div className="menu__row">
              <span>{t.home.pricingGroupQuotedItem}</span>
              <b>{zh ? "另議" : "Quoted"}</b>
            </div>
            <p className="menu__desc">{planDetails.business}</p>
            <Link href={`/${locale}/contact`} className="ps-link font-semibold">
              {t.pricing.contactSales} →
            </Link>
          </div>
        </div>
      </section>

      <section className="faqread" style={{ paddingTop: 0 }}>
        <div>
          <h2 className="ps-h" data-reveal>
            {t.pricing.compareTitle}
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="menu__photo"
            src="/assets/hemelkaart-van-de-banen-van-venus-en.jpg"
            alt="Engraved chart of the orbits of Venus and Mercury, 1660"
            width={1920}
            height={1615}
            loading="lazy"
            data-reveal
            style={{ maxWidth: 340 }}
          />
        </div>
        <div data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
          <table className="w-full text-[16px]">
            <thead>
              <tr className="border-b border-[var(--surface-2)] text-left" /* taste-skill-ignore hairline: real table */>
                <th className="py-3 pr-4 font-semibold text-[var(--muted)]"> </th>
                {ALL_PLANS.map((plan) => (
                  <th key={plan.id} className="px-4 py-3 font-semibold text-[var(--ink)]">{zh ? plan.nameZh : plan.nameEn}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-2)]" /* taste-skill-ignore hairline: real table */>
              {(
                [
                  [zh ? "月費" : "Monthly price", (id: string) => (id === "trial" ? (zh ? "免費十四天" : "Free 14 days") : id === "business" ? (zh ? "另議" : "Quoted") : `${currency} ${ALL_PLANS.find((x) => x.id === id)!.priceHkd}`)],
                  [t.pricing.seatsLabel, (id: string) => ALL_PLANS.find((x) => x.id === id)!.limits.seats || "—"],
                  [t.pricing.answersLabel, (id: string) => ALL_PLANS.find((x) => x.id === id)!.limits.answers.toLocaleString()],
                  [t.pricing.documentsLabel, (id: string) => ALL_PLANS.find((x) => x.id === id)!.limits.documents || "—"],
                  [t.pricing.storageLabel, (id: string) => { const mb = ALL_PLANS.find((x) => x.id === id)!.limits.storageMb; return mb ? (mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`) : "—"; }],
                  [t.pricing.concurrencyLabel, (id: string) => ALL_PLANS.find((x) => x.id === id)!.limits.concurrency || "—"],
                  [t.common.supportChannel, (id: string) => (id === "team" ? t.pricing.supportPriority : id === "business" ? t.pricing.supportNamed : t.pricing.supportEmail)],
                ] as Array<[string, (id: string) => string | number]>
              ).map(([label, fn], i) => (
                <tr key={i}>
                  <td className="py-3 pr-4 font-medium text-[var(--ink)]">{label}</td>
                  {ALL_PLANS.map((plan) => (
                    <td key={plan.id} className="px-4 py-3 text-[var(--muted)]">{fn(plan.id)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="faqread" style={{ paddingTop: 0, paddingBottom: 140 }}>
        <div>
          <h2 className="ps-h" data-reveal>
            {t.pricing.faqTitle}
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="menu__photo"
            src="/assets/starry-sky-with-north-star-circled-poster.jpg"
            alt="Stars turning about the celestial pole"
            width={1280}
            height={720}
            loading="lazy"
            data-reveal
            style={{ maxWidth: 340, aspectRatio: "16 / 9", objectFit: "cover" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="menu__photo"
            src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
            alt="Engraved celestial chart of the constellations, 1660"
            width={1920}
            height={1624}
            loading="lazy"
            data-reveal
            style={{ maxWidth: 340 }}
          />
        </div>
        <div className="md:columns-2 md:gap-14" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
          {t.pricing.faq.map((item, i) => (
            <p key={i} className="mb-5 break-inside-avoid text-[16.5px] leading-relaxed text-[var(--muted)]">
              <b className="font-semibold text-[var(--ink)]">{item.q}</b> {item.a}
            </p>
          ))}
        </div>
        <p className="mt-8 text-[15px] text-[var(--muted)]" data-reveal>{t.pricing.cancellationNote}</p>
      </section>

      <section style={{ padding: "30px 48px 130px" }}>
        <figure style={{ margin: 0 }} data-reveal data-drift>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/starry-sky-with-north-star-circled-poster.jpg"
            alt="Stars turning about the celestial pole"
            width={1280}
            height={720}
            loading="lazy"
            style={{ width: "100%", aspectRatio: "21 / 9", objectFit: "cover", borderRadius: "var(--radius)", display: "block" }}
          />
        </figure>
        <p data-reveal style={{ ["--reveal-delay" as string]: "80ms", marginTop: 18, fontSize: 16, color: "var(--muted)", maxWidth: "70ch" } as React.CSSProperties}>{t.pricing.cancellationNote}</p>
      </section>

    </div>
  );
}
