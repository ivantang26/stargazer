import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import { getDb, ensureSeeded } from "@/lib/db";
import PageHero from "@/components/public/page-hero";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.resources.metaTitle, description: t.resources.metaDescription, alternates: alternatesFor("/resources") };
}

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
      <PageHero title={t.resources.title} sub={t.resources.subtitle} />
      <section className="ps-container pb-24">
        {entries.length === 0 ? (
          <p className="rounded-[var(--r-lg)] border border-dashed border-ps-line p-10 text-center text-[15px] text-ps-muted">
            {locale === "zh-hant" ? "暫時未有指南。" : "No guides published yet."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {entries.map((e, i) => {
              const mins = Math.max(2, Math.round(e.len / (locale === "zh-hant" ? 550 : 950)));
              return (
                <Link
                  key={e.slug}
                  href={`/${locale}/resources/${e.slug}`}
                  className="group flex flex-col rounded-[var(--r-lg)] border border-ps-line bg-ps-surface p-6 transition hover:border-ps-accent"
                  data-reveal
                  style={{ ["--reveal-delay" as string]: `${(i % 2) * 60}ms` }}
                >
                  <p className="font-mono text-[12.5px] text-ps-muted">
                    {e.published_at.slice(0, 10)} · {mins} {t.resources.minRead}
                  </p>
                  <h2 className="mt-3 text-[18px] font-semibold leading-snug tracking-tight text-ps-ink">{e.title}</h2>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ps-muted">{e.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-ps-accent">
                    {t.resources.readMore}
                    <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
