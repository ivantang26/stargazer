import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";

/** Closing band: one line, one sentence, the same two actions as the hero. */
export default function FinalCta({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <section className="ps-container pb-20 md:pb-28">
      <div
        className="flex flex-col gap-8 rounded-[var(--r-lg)] border border-ps-line bg-[var(--invert-bg)] px-6 py-12 text-[var(--invert-ink)] md:flex-row md:items-end md:justify-between md:px-12 md:py-14"
        data-reveal
      >
        <div>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t.home.ctaTitle}</h2>
          <p className="mt-3 max-w-[44ch] text-[16px] opacity-75">{t.home.ctaBody}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/${locale}/signup`} className="ps-action">
            {t.common.startTrial}
          </Link>
          <Link
            href={`/${locale}/demo`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-[var(--r-sm)] border px-4 py-2.5 text-[15px] font-medium opacity-90 transition hover:opacity-100"
            style={{ borderColor: "color-mix(in srgb, currentColor 30%, transparent)" }}
          >
            {t.common.tryDemo}
          </Link>
        </div>
      </div>
    </section>
  );
}
