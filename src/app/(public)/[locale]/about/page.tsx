import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.about.metaTitle, description: t.about.metaDescription, alternates: alternatesFor("/about") };
}

/**
 * About: the harbour we start from on the first screen, the three paragraphs
 * as one reading argument beside the observatory plate, the stars turning,
 * and the contact close.
 */
export default async function AboutPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  return (
    <div>
      <section className="ihero">
        <div>
          <h1 className="ihero__title" data-reveal>{t.about.title}</h1>
          <p className="ihero__sub" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            {t.about.paragraphs[0]}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/contact")} className="ps-action">{t.about.contactCta}</Link>
            <Link href={p("/products/knowledge")} className="ps-link">{t.nav.knowledgeWorkspace} →</Link>
          </div>
        </div>
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ihero__plate"
            src="/assets/victoria-harbour-hong-kong.jpg"
            alt="Victoria Harbour, Hong Kong, seen across the water"
            width={1920}
            height={1278}
            data-reveal
            style={{ ["--reveal-delay" as string]: "100ms", aspectRatio: "3 / 2" }}
          />
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {locale === "zh-hant" ? "維多利亞港——我們首先服務的城市。" : "Victoria Harbour — the city we start in."}
          </figcaption>
        </figure>
      </section>

      <section className="readgrid">
        <div className="readgrid__rail">
          <h2 className="readgrid__h" data-reveal>{t.about.whyTitle}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
            src="/assets/kitlv-51w12-spyk-j-van-der-observatoire.jpg"
            alt="Copper engraving of the Peking observatory with its brass instruments, 1736"
            width={1920}
            height={1433}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "90ms" }}
          />
        </div>
        <div className="readgrid__text">
          {t.about.paragraphs.slice(1).map((para, i) => (
            <p key={i} data-reveal style={{ ["--reveal-delay" as string]: i === 0 ? "70ms" : "140ms" }}>{para}</p>
          ))}
        </div>
      </section>

      <figure className="videoband" style={{ margin: 0 }}>
        <video
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          poster="/assets/starry-sky-with-north-star-circled-poster.jpg"
        >
          <source src="/assets/starry-sky-with-north-star-circled.webm" type="video/webm" />
        </video>
        <figcaption className="videoband__caption" data-reveal>{t.home.videoCaption}</figcaption>
      </figure>

      <section className="readgrid" style={{ paddingTop: 110, paddingBottom: 150 }}>
        <div className="readgrid__rail">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
            src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
            alt="Engraved celestial chart of the constellations, 1660"
            width={1920}
            height={1624}
            loading="lazy"
            data-reveal
          />
        </div>
        <div>
          <h2 className="readgrid__h" data-reveal>{t.about.contactTitle}</h2>
          <p className="readgrid__text-inline" data-reveal style={{ ["--reveal-delay" as string]: "70ms", marginTop: 18, fontSize: "17.5px", lineHeight: 1.6, maxWidth: "56ch", color: "var(--ink)" }}>
            {t.about.contactBody}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/contact")} className="ps-action">{t.about.contactCta}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
