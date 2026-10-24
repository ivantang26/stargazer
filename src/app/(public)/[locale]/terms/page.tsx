import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.terms.metaTitle, description: t.terms.metaDescription, alternates: alternatesFor("/terms") };
}

/**
 * The terms as a reading document: the astrolabe (the agreed instrument) on
 * the first screen, the clauses in one measure, the harbour and the stars in
 * the rail.
 */
export default async function TermsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  return (
    <div>
      <section className="ihero">
        <div>
          <h1 className="ihero__title" data-reveal>{t.terms.title}</h1>
          <p className="ihero__sub" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            {t.terms.metaDescription}
          </p>
          <p style={{ marginTop: 16, fontSize: 16, color: "var(--muted)" }} data-reveal>
            {t.terms.updated}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/pricing")} className="ps-action">{t.nav.pricing}</Link>
            <Link href={p("/privacy")} className="ps-link">{t.nav.privacy} →</Link>
          </div>
        </div>
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="onpaper"><img
            className="ihero__plate"
            src="/assets/yale-s-hartmann-astrolabe.jpg"
            alt="Engraved brass astrolabe, an instrument whose readings can be checked"
            width={1920}
            height={1769}
            data-reveal
            style={{ ["--reveal-delay" as string]: "100ms", aspectRatio: "1 / 1", maxWidth: 460 }}
          /></span>
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {locale === "zh-hant" ? "星盤——雙方共同依循的儀器。" : "The astrolabe: the instrument both sides read the same way."}
          </figcaption>
        </figure>
      </section>

      <figure style={{ margin: 0 }} data-reveal>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/victoria-harbour-hong-kong.jpg"
          alt="Victoria Harbour, Hong Kong, seen across the water"
          width={1920}
          height={1278}
          loading="lazy"
          style={{ width: "100%", aspectRatio: "3 / 2", objectFit: "cover", display: "block", maxHeight: "56svh" }}
        />
      </figure>

      <section className="docpage" style={{ paddingTop: 96, paddingBottom: 150 }}>
        <div className="docpage__rail">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="docpage__plate"
            src="/assets/starry-sky-with-north-star-circled-poster.jpg"
            alt="Stars turning about the celestial pole"
            width={1280}
            height={720}
            loading="lazy"
            data-reveal
            style={{ aspectRatio: "16 / 9", objectFit: "cover" } as React.CSSProperties}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="docpage__plate"
            src="/assets/victoria-harbour-hong-kong.jpg"
            alt="Victoria Harbour, Hong Kong, seen across the water"
            width={1920}
            height={1278}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "120ms", aspectRatio: "3 / 2", objectFit: "cover" } as React.CSSProperties}
          />
        </div>
        <div className="docpage__body">
          {t.terms.sections.map((s, i) => (
            <div key={i}>
              <h2 data-reveal>{s.title}</h2>
              <p data-reveal style={{ ["--reveal-delay" as string]: "60ms" } as React.CSSProperties}>{s.body}</p>
              {i === 3 && (
                <figure style={{ margin: "2.6em 0" }} data-reveal>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/hemelkaart-van-de-banen-van-venus-en.jpg"
                    alt="Engraved chart of the orbits of Venus and Mercury, 1660"
                    width={1920}
                    height={1615}
                    loading="lazy"
                    style={{ width: "100%", borderRadius: "var(--radius)", display: "block" }}
                  />
                  <figcaption style={{ marginTop: 10, fontSize: 16, color: "var(--muted)" }}>
                    {locale === "zh-hant" ? "金星與水星的軌道圖，1660 年。" : "The orbits of Venus and Mercury, engraved 1660."}
                  </figcaption>
                </figure>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="readgrid" style={{ paddingTop: 40 }}>
        <div className="readgrid__rail">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
            src="/assets/starry-sky-with-north-star-circled-poster.jpg"
            alt="Stars turning about the celestial pole"
            width={1280}
            height={720}
            loading="lazy"
            data-reveal
            data-drift
            style={{ aspectRatio: "16 / 9", objectFit: "cover" } as React.CSSProperties}
          />
        </div>
        <div>
          <h2 className="readgrid__h" data-reveal>{t.about.contactTitle}</h2>
          <p data-reveal style={{ ["--reveal-delay" as string]: "70ms", marginTop: 18, fontSize: "var(--step-body)", lineHeight: 1.6, maxWidth: "56ch", color: "var(--ink)" } as React.CSSProperties}>
            {t.contact.nextBody}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/contact")} className="ps-action">{t.about.contactCta}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
