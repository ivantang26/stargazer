import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import PageHero, { Section } from "@/components/public/page-hero";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.about.metaTitle, description: t.about.metaDescription, alternates: alternatesFor("/about") };
}

export default async function AboutPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  return (
    <div>
      <PageHero
        title={t.about.title}
        sub={t.about.paragraphs[0]}
        aside={
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--r-lg)]">
            <Image
              src="/assets/victoria-harbour-hong-kong.jpg"
              alt={locale === "zh-hant" ? "從海上遠眺香港維多利亞港" : "Victoria Harbour, Hong Kong, seen across the water"}
              fill
              priority
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover"
            />
          </div>
        }
      />

      <Section tone="raised">
        <div className="grid gap-8 lg:grid-cols-[4fr_8fr] lg:gap-16">
          <h2 className="text-2xl font-semibold tracking-tight text-ps-ink md:text-3xl" data-reveal>
            {t.about.whyTitle}
          </h2>
          <div className="space-y-5" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
            {t.about.paragraphs.slice(1).map((para, i) => (
              <p key={i} className="max-w-[64ch] text-[17px] leading-relaxed text-ps-ink">
                {para}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <div className="max-w-2xl" data-reveal>
          <h2 className="text-2xl font-semibold tracking-tight text-ps-ink md:text-3xl">{t.about.contactTitle}</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ps-muted">{t.about.contactBody}</p>
          <Link href={p("/contact")} className="ps-action mt-8">{t.about.contactCta}</Link>
        </div>
      </Section>
    </div>
  );
}
