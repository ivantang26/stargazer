import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import LiveAsk from "./live-ask";

/** Split hero: the promise on the left, the working product on the right. */
export default function Hero({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <section className="ps-container grid items-center gap-12 pb-20 pt-12 md:pt-20 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-12 xl:grid-cols-[1fr_minmax(0,520px)] xl:gap-16">
      <div>
        <p className="text-[14px] font-medium text-ps-accent">
          {t.home.badge}
        </p>
        <h1
          className="mt-4 max-w-[14em] text-4xl font-semibold leading-[1.1] tracking-tight text-ps-ink md:text-5xl lg:text-[42px] xl:text-[52px]"
        >
          {t.home.headline}
        </h1>
        <p
          className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ps-muted md:text-lg"
        >
          {t.home.heroSub}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={`/${locale}/signup`} className="ps-action">
            {t.common.startTrial}
          </Link>
          <Link href={`/${locale}/demo`} className="ps-secondary">
            {t.common.tryDemo}
          </Link>
        </div>
      </div>
      <div>
        <LiveAsk locale={locale} />
        <p className="mt-3 text-[13px] text-ps-muted">{t.home.heroNote}</p>
      </div>
    </section>
  );
}
