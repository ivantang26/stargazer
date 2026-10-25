import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
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
  return entry ? { title: `${entry.title} - Stargazer`, description: entry.summary } : {};
}

/** Minimal, safe rendering of seeded markdown-ish article bodies (headings, lists, bold, paragraphs). */
function ArticleBody({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/);
  return (
    <div className="doc-body">
      {blocks.map((block, i) =>
        block.startsWith("## ") ? (
          <h2 key={i}>{block.slice(3)}</h2>
        ) : /^\d\.\s/m.test(block) ? (
          <ol key={i}>
            {block.split("\n").filter(Boolean).map((item, j) => (
              <li key={j} dangerouslySetInnerHTML={{ __html: inline(item.replace(/^\d+\.\s*/, "")) }} />
            ))}
          </ol>
        ) : (
          <p key={i} dangerouslySetInnerHTML={{ __html: inline(block) }} />
        )
      )}
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

/** A guide: title, summary and date, then the body in one readable measure. */
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
  const mins = Math.max(2, Math.round(entry.body.length / (locale === "zh-hant" ? 550 : 950)));

  return (
    <article className="ps-container max-w-[820px] pb-24 pt-10 md:pt-14">
      <Link href={`/${locale}/resources`} className="ps-link inline-flex items-center gap-1.5">
        <ArrowLeft size={15} />
        {t.resources.backToList}
      </Link>
      <h1 className="mt-8 text-3xl font-semibold leading-tight tracking-tight text-ps-ink md:text-[42px]">{entry.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ps-muted">{entry.summary}</p>
      <p className="mt-4 border-b border-ps-line pb-8 font-mono text-[12.5px] text-ps-muted">
        {entry.published_at.slice(0, 10)} · {mins} {t.resources.minRead}
      </p>
      <div className="mt-10">
        <ArticleBody body={entry.body} />
      </div>
    </article>
  );
}
