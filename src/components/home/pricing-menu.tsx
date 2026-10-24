import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";

/**
 * Prices set the way a good menu sets them: grouped rows, name left, price
 * right on the same baseline, one line of description under each, space doing
 * the joining. The observatory engraving sits under the heading.
 */
export default function PricingMenu({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const currency = zh ? "港元" : "HKD";
  return (
    <section className="menu" id="pricing">
      <div>
        <h2 className="ps-h" data-reveal>
          {t.nav.pricing}
        </h2>
        <p className="menu__footnote" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
          {t.pricing.currencyNote}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="menu__photo"
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
          <h3 className="menu__groupname">{t.home.pricingGroupTrial}</h3>
          <div className="menu__row">
            <span>{t.pricing.planTrialTagline}</span>
            <b>{zh ? "免費" : "Free"}</b>
          </div>
          <p className="menu__desc">{t.pricing.planTrialNote}</p>
        </div>
        <div className="menu__group" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
          <h3 className="menu__groupname">{t.home.pricingGroupPaid}</h3>
          <div className="menu__row">
            <span>Starter</span>
            <b>{currency} 499</b>
          </div>
          <p className="menu__desc">
            {zh ? "1 席位 · 每期 500 答案 · 100 文件 · 1 GB" : "1 seat · 500 answers a period · 100 documents · 1 GB"}
          </p>
          <div className="menu__row">
            <span>Team</span>
            <b>{currency} 1,499</b>
          </div>
          <p className="menu__desc">
            {zh ? "5 席位 · 每期 2,500 答案 · 500 文件 · 5 GB" : "5 seats · 2,500 answers a period · 500 documents · 5 GB"}
          </p>
        </div>
        <div className="menu__group" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
          <h3 className="menu__groupname">{t.home.pricingGroupQuoted}</h3>
          <div className="menu__row">
            <span>{t.home.pricingGroupQuotedItem}</span>
            <b>{zh ? "另議" : "Quoted"}</b>
          </div>
          <p className="menu__desc">{t.pricing.planBusinessNote}</p>
        </div>
        <p className="menu__footnote" data-reveal>
          {t.pricing.faq[0].a}
        </p>
        <div className="mt-2" data-reveal>
          <Link href={`/${locale}/pricing`} className="ps-action">
            {t.common.learnMore}
          </Link>
        </div>
      </div>
    </section>
  );
}
