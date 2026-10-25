import Link from "next/link";
import Image from "next/image";
import { LockSimple, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { dict, type Locale } from "@/lib/i18n";

/** Where it is made and what happens to your documents, beside the harbour. */
export default function LocalBand({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <section className="ps-container grid items-center gap-10 pb-20 md:pb-28 lg:grid-cols-[7fr_5fr] lg:gap-16">
      <div className="relative aspect-[3/2] overflow-hidden rounded-[var(--r-lg)]" data-reveal>
        <Image
          src="/assets/victoria-harbour-hong-kong.jpg"
          alt={locale === "zh-hant" ? "從海上遠眺香港維多利亞港" : "Victoria Harbour, Hong Kong, seen across the water"}
          fill
          sizes="(min-width: 1024px) 680px, 100vw"
          className="object-cover"
        />
      </div>
      <div data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
        <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight text-ps-ink md:text-4xl">{t.home.localTitle}</h2>
        <div className="mt-8 flex gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-ps-accent-soft text-ps-accent">
            <LockSimple size={20} />
          </span>
          <div>
            <h3 className="text-[17px] font-semibold text-ps-ink">{t.home.dataTitle}</h3>
            <p className="mt-2 max-w-[48ch] text-[15px] leading-relaxed text-ps-muted">{t.home.dataBody}</p>
            <Link
              href={`/${locale}/security`}
              className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-ps-accent hover:underline hover:underline-offset-4"
            >
              {t.nav.security}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
