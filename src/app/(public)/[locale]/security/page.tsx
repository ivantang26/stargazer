import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.security.metaTitle, description: t.security.metaDescription, alternates: alternatesFor("/security") };
}

/**
 * Security: the observatory — the instrumented watcher — on the first screen,
 * then the controls that exist today as one plain-language reading document,
 * with the collection's plates in the rail.
 */
export default async function SecurityPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  return (
    <div>
      <section className="ihero">
        <div>
          <h1 className="ihero__title" data-reveal>{t.security.title}</h1>
          <p className="ihero__sub" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            {t.security.subtitle}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/contact")} className="ps-action">{t.about.contactCta}</Link>
            <Link href={p("/privacy")} className="ps-link">{t.nav.privacy} →</Link>
          </div>
        </div>
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ihero__plate"
            src="/assets/kitlv-51w12-spyk-j-van-der-observatoire.jpg"
            alt="Copper engraving of the Peking observatory with its instruments, 1736"
            width={1920}
            height={1433}
            data-reveal
            style={{ ["--reveal-delay" as string]: "100ms", aspectRatio: "4 / 3", maxWidth: 520 }}
          />
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {locale === "zh-hant" ? "北京觀象台——儀器常年對準天空。" : "The Peking observatory: instruments kept on the sky."}
          </figcaption>
        </figure>
      </section>

      <section className="docpage" style={{ paddingTop: 0, paddingBottom: 150 }}>
        <div className="docpage__rail">
          <h2 className="readgrid__h" data-reveal>{t.security.controlsTitle}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="docpage__plate"
            src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
            alt="Engraved celestial chart of the constellations, 1660"
            width={1920}
            height={1624}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "90ms" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="docpage__plate"
            src="/assets/starry-sky-with-north-star-circled-poster.jpg"
            alt="Stars turning about the celestial pole"
            width={1280}
            height={720}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "150ms", aspectRatio: "16 / 9", objectFit: "cover" }}
          />
        </div>
        <div className="docpage__body">
          {t.security.sections.map((s, i) => (
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
                    style={{ width: "100%", maxWidth: 520, borderRadius: "var(--radius)", display: "block" }}
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
    </div>
  );
}
