import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { dict, type Locale } from "@/lib/i18n";
import { PLANS } from "@/lib/plans";

/**
 * Pricing summary: the three self-service plans side by side with Team
 * marked as the shared-workspace default, and Business as a quoted line.
 */
export default function PricingStrip({
  locale,
  hideHeader = false,
}: {
  locale: Locale;
  hideHeader?: boolean;
}) {
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const currency = zh ? "港元" : "HKD";
  const plans = [
    { plan: PLANS.trial, price: zh ? "免費" : "Free", unit: zh ? "十四天" : "14 days", note: t.pricing.planTrialTagline, featured: false },
    { plan: PLANS.starter, price: `${currency} 499`, unit: t.home.pricingPerMonth, note: t.pricing.planStarterTagline, featured: false },
    { plan: PLANS.team, price: `${currency} 1,499`, unit: t.home.pricingPerMonth, note: t.pricing.planTeamTagline, featured: true },
  ];
  return (
    <section className="border-y border-ps-line bg-ps-surface" id="pricing">
      <div className={`ps-container ${hideHeader ? "py-12" : "py-20 md:py-28"}`}>
        {!hideHeader && (
          <>
            <h2 className="text-3xl font-semibold tracking-tight text-ps-ink md:text-4xl" data-reveal>
              {t.home.pricingTitle}
            </h2>
            <p className="mt-3 max-w-[60ch] text-[15px] text-ps-muted" data-reveal>
              {t.pricing.currencyNote}
            </p>
          </>
        )}

        <div className={`${hideHeader ? "" : "mt-10 "}grid gap-4 md:grid-cols-3`}>
          {plans.map(({ plan, price, unit, note, featured }, i) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-[var(--r-lg)] border p-6 ${featured ? "border-ps-accent bg-ps-bg ring-1 ring-ps-accent" : "border-ps-line bg-ps-bg"}`}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}
            >
              <h3 className="text-[15px] font-semibold text-ps-ink">{zh ? plan.nameZh : plan.nameEn}</h3>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-ps-ink [font-variant-numeric:tabular-nums]">{price}</span>
                <span className="text-[14px] text-ps-muted">{unit}</span>
              </p>
              <p className="mt-2 text-[14px] text-ps-muted">{note}</p>
              <ul className="mt-6 space-y-1.5 border-t border-ps-line pt-5 text-[14px] text-ps-ink">
                <li>
                  {plan.limits.seats} {zh ? "席位" : plan.limits.seats === 1 ? "seat" : "seats"}
                </li>
                <li>
                  {plan.limits.answers.toLocaleString()} {zh ? "個答案" : "answers"}
                  {plan.kind === "trial" ? (zh ? "（整個試用期）" : " in total") : zh ? "／每期" : " a period"}
                </li>
                <li>
                  {plan.limits.documents} {zh ? "份文件" : "documents"}
                </li>
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[var(--r-lg)] border border-ps-line bg-ps-bg p-6 md:flex-row md:items-center md:justify-between" data-reveal>
          <div>
            <h3 className="text-[15px] font-semibold text-ps-ink">{zh ? PLANS.business.nameZh : PLANS.business.nameEn}</h3>
            <p className="mt-1 text-[14px] text-ps-muted">{t.pricing.planBusinessTagline}</p>
          </div>
          <Link href={`/${locale}/contact`} className="ps-secondary self-start md:self-auto">
            {t.pricing.contactSales}
          </Link>
        </div>

        {!hideHeader && (
          <Link
            href={`/${locale}/pricing`}
            className="mt-8 inline-flex items-center gap-1.5 text-[15px] font-medium text-ps-accent hover:underline hover:underline-offset-4"
          >
            {t.home.pricingSeeAll}
            <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </section>
  );
}
