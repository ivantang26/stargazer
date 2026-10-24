import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import { getDb, ensureSeeded } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.resources.metaTitle, description: t.resources.metaDescription, alternates: alternatesFor("/resources") };
}

/**
 * Resources: the observatory (the reference library) on the first screen,
 * then the guides set like a programme's notes — title, summary, date — with
 * a quiet rail of plates beside the list.
 */
export default async function ResourcesPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  await ensureSeeded();
  const entries = getDb()
    .prepare(
      `SELECT slug, title, summary, published_at, LENGTH(body) AS len FROM content_entries
       WHERE locale = ? AND status = 'published' ORDER BY published_at DESC`
    )
    .all(locale) as Array<{ slug: string; title: string; summary: string; published_at: string; len: number }>;

  return (
    <div>
      <section className="ihero">
        <div>
          <h1 className="ihero__title" data-reveal>{t.resources.title}</h1>
          <p className="ihero__sub" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            {t.resources.subtitle}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={`/${locale}/demo`} className="ps-action">{t.common.tryDemo}</Link>
          </div>
        </div>
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ihero__plate"
            src="/assets/kitlv-51w12-spyk-j-van-der-observatoire.jpg"
            alt="Copper engraving of the Peking observatory with its brass instruments, 1736"
            width={1920}
            height={1433}
            data-reveal
            style={{ ["--reveal-delay" as string]: "100ms", aspectRatio: "4 / 3", maxWidth: 520 }}
          />
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {locale === "zh-hant" ? "北京觀象台，1736 年銅版畫。" : "The Peking observatory, copper engraving, 1736."}
          </figcaption>
        </figure>
      </section>

      <section className="readgrid" style={{ paddingTop: 0, paddingBottom: 150 }}>
        <div className="readgrid__rail">
          <h2 className="readgrid__h" data-reveal>{t.resources.listTitle}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
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
            className="readgrid__plate"
            src="/assets/hemelkaart-van-de-banen-van-venus-en.jpg"
            alt="Engraved chart of the orbits of Venus and Mercury, 1660"
            width={1920}
            height={1615}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "150ms" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
            src="/assets/starry-sky-with-north-star-circled-poster.jpg"
            alt="Stars turning about the celestial pole"
            width={1280}
            height={720}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "210ms", aspectRatio: "16 / 9", objectFit: "cover" }}
          />
        </div>
        <div className="readlist">
          {entries.map((e) => {
            const mins = Math.max(2, Math.round(e.len / (locale === "zh-hant" ? 550 : 950)));
            return (
              <article key={e.slug} className="readlist__row" data-reveal>
                <div>
                  <Link href={`/${locale}/resources/${e.slug}`} className="readlist__title">
                    {e.title}
                  </Link>
                  <p className="readlist__summary">{e.summary}</p>
                </div>
                <p className="readlist__meta">
                  {e.published_at} · {mins} {t.resources.minRead}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
