import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, type Locale } from "@/lib/i18n";
import { getDb, ensureSeeded } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Entry {
  slug: string;
  title: string;
  summary: string;
  body: string;
  published_at: string;
}

function getEntry(locale: string, slug: string): Entry | null {
  const row = getDb()
    .prepare(
      `SELECT slug, title, summary, body, published_at FROM content_entries
       WHERE locale = ? AND slug = ? AND status = 'published'`
    )
    .get(locale, slug) as Entry | undefined;
  return row ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const entry = getEntry(params.locale, params.slug);
  return entry ? { title: `${entry.title} — Stargazer`, description: entry.summary } : {};
}

/** Minimal, safe rendering of seeded markdown-ish article bodies (headings, lists, bold, paragraphs). */
function ArticleBody({ body, plates }: { body: string; plates: Plate[] }) {
  const blocks = body.split(/\n\n+/);
  const inlineFigureIndex = Math.floor(blocks.length * 0.45);
  return (
    <div className="prose-stargazer">
      {blocks.map((block, i) => (
        <div key={i}>
          {i === inlineFigureIndex && <InlinePlate plate={plates[3]} />}
          {block.startsWith("## ") ? (
            <h2>{block.slice(3)}</h2>
          ) : /^\d\.\s/m.test(block) ? (
            <ol>
              {block.split("\n").filter(Boolean).map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: inline(item.replace(/^\d+\.\s*/, "")) }} />
              ))}
            </ol>
          ) : (
            <p dangerouslySetInnerHTML={{ __html: inline(block) }} />
          )}
        </div>
      ))}
    </div>
  );
}

function inline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

type Plate = { src: string; alt: string; ratio: string };

const PLATES: Plate[] = [
  { src: "/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg", alt: "Engraved celestial chart of the constellations, 1660", ratio: "1920 / 1624" },
  { src: "/assets/hemelkaart-van-de-banen-van-venus-en.jpg", alt: "Engraved chart of the orbits of Venus and Mercury, 1660", ratio: "1920 / 1615" },
  { src: "/assets/kitlv-51w12-spyk-j-van-der-observatoire.jpg", alt: "Copper engraving of the Peking observatory, 1736", ratio: "1920 / 1433" },
  { src: "/assets/yale-s-hartmann-astrolabe.jpg", alt: "Engraved brass astrolabe, an instrument whose readings can be checked", ratio: "1920 / 1769" },
  { src: "/assets/starry-sky-with-north-star-circled-poster.jpg", alt: "Stars turning about the celestial pole", ratio: "1280 / 720" },
  { src: "/assets/victoria-harbour-hong-kong.jpg", alt: "Victoria Harbour, Hong Kong, seen across the water", ratio: "1920 / 1278" },
];

function InlinePlate({ plate }: { plate: Plate }) {
  if (!plate) return null;
  return (
    <figure style={{ margin: "2.4em 0" }} data-reveal>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={plate.src}
        alt={plate.alt}
        width={1280}
        height={960}
        loading="lazy"
        style={{ width: "100%", aspectRatio: plate.ratio, objectFit: "cover", borderRadius: "var(--radius)", display: "block" }}
      />
      <figcaption style={{ marginTop: 10, fontSize: 16, color: "var(--muted)" }}>{plate.alt}</figcaption>
    </figure>
  );
}

/**
 * A guide as a reading page: the title at reading-display size, the plates of
 * the collection's world in a quiet rail, and the body set in one measure.
 * The plates rotate by slug so each guide sits among different neighbours.
 */
export default async function ArticlePage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  await ensureSeeded();
  const entry = getEntry(locale, params.slug);
  if (!entry) notFound();

  const hash = [...entry.slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const plates = [0, 1, 2, 3].map((i) => PLATES[(hash + i) % PLATES.length]);
  const mins = Math.max(2, Math.round(entry.body.length / (locale === "zh-hant" ? 550 : 950)));

  return (
    <article>
      <header style={{ padding: "56px 48px 64px" }}>
        <h1
          data-reveal
          style={{ fontSize: "clamp(34px, 4.6vw, 64px)", lineHeight: 1.06, letterSpacing: "-0.025em", fontWeight: 500, maxWidth: "20ch" }}
        >
          {entry.title}
        </h1>
        <p
          data-reveal
          style={{ ["--reveal-delay" as string]: "70ms", marginTop: 20, fontSize: "clamp(19px, 1.5vw, 22px)", lineHeight: 1.5, maxWidth: "52ch", color: "var(--muted)" } as React.CSSProperties}
        >
          {entry.summary}
        </p>
        <p data-reveal style={{ ["--reveal-delay" as string]: "130ms", marginTop: 18, fontSize: 16, color: "var(--muted)" } as React.CSSProperties}>
          {entry.published_at} · {mins} {t.resources.minRead}
        </p>
      </header>

      <div
        style={{
          width: "100%",
          aspectRatio: plates[0].ratio,
          maxHeight: "62svh",
          objectFit: "cover",
          borderRadius: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plates[0].src}
          alt={plates[0].alt}
          width={1920}
          height={1300}
          data-reveal
          style={{ width: "100%", height: "100%", maxHeight: "62svh", objectFit: "cover", display: "block" }}
        />
      </div>

      <div className="docpage" style={{ paddingTop: 96 }}>
        <div className="docpage__rail">
          <Link href={`/${locale}/resources`} className="ps-link" style={{ fontSize: 17 }}>
            ← {t.resources.backToList}
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="docpage__plate"
            src={plates[1].src}
            alt={plates[1].alt}
            width={1920}
            height={1500}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "90ms" } as React.CSSProperties}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="docpage__plate"
            src={plates[2].src}
            alt={plates[2].alt}
            width={1920}
            height={1500}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "150ms" } as React.CSSProperties}
          />
        </div>
        <div className="docpage__body" data-reveal>
          <ArticleBody body={entry.body} plates={plates} />
        </div>
      </div>
    </article>
  );
}
