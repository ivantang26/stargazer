import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.privacy.metaTitle, description: t.privacy.metaDescription, alternates: alternatesFor("/privacy") };
}

/**
 * The privacy notice as a reading document: the orbit chart on the first
 * screen, the data inventory as the real table it is, full width and early,
 * then the notice's own words in one measure.
 */
export default async function PrivacyPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  const inv = t.privacy.inventory;
  const invKeys: Array<[keyof (typeof inv)[number], string]> = [
    ["category", t.privacy.colCategory],
    ["purpose", t.privacy.colPurpose],
    ["recipients", t.privacy.colRecipients],
    ["retention", t.privacy.colRetention],
    ["deletion", t.privacy.colDeletion],
  ];
  return (
    <div>
      <section className="ihero" style={{ paddingBottom: 90 }}>
        <div>
          <h1 className="ihero__title" data-reveal>{t.privacy.title}</h1>
          <p className="ihero__sub" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            {t.privacy.metaDescription}
          </p>
          <p style={{ marginTop: 16, fontSize: 16, color: "var(--muted)" }} data-reveal>
            {t.privacy.updated}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/contact")} className="ps-action">{t.about.contactCta}</Link>
            <Link href={p("/security")} className="ps-link">{t.nav.security} →</Link>
          </div>
        </div>
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ihero__plate"
            src="/assets/hemelkaart-van-de-banen-van-venus-en.jpg"
            alt="Engraved chart of the orbits of Venus and Mercury, 1660"
            width={1920}
            height={1615}
            data-reveal
            style={{ ["--reveal-delay" as string]: "100ms", maxWidth: 460 }}
          />
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {locale === "zh-hant" ? "行星各有可循的軌道。" : "Every body keeps a traceable orbit."}
          </figcaption>
        </figure>
      </section>

      <section style={{ padding: "0 48px 40px" }}>
        <h2 className="readgrid__h" data-reveal style={{ marginBottom: 30 }}>{t.privacy.inventoryTitle}</h2>
        <table className="doctable" data-reveal style={{ ["--reveal-delay" as string]: "80ms" } as React.CSSProperties}>
          <thead>
            <tr>
              {invKeys.map(([, label]) => (
                <th key={label} style={{ minWidth: 130 }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inv.map((row) => (
              <tr key={row.category}>
                {invKeys.map(([key]) => (
                  <td key={key} style={{ lineHeight: 1.5 }}>{row[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="docpage" style={{ paddingTop: 40, paddingBottom: 150 }}>
        <div className="docpage__rail">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="docpage__plate"
            src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
            alt="Engraved celestial chart of the constellations, 1660"
            width={1920}
            height={1624}
            loading="lazy"
            data-reveal
            data-drift
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
            style={{ ["--reveal-delay" as string]: "120ms", aspectRatio: "16 / 9", objectFit: "cover" } as React.CSSProperties}
          />
        </div>
        <div className="docpage__body">
          <p data-reveal>{t.privacy.intro}</p>
          <h2 data-reveal>{t.privacy.noTrainingTitle}</h2>
          <p data-reveal>{t.privacy.noTrainingBody}</p>
          <h2 data-reveal>{t.privacy.rightsTitle}</h2>
          <p data-reveal>{t.privacy.rightsBody}</p>
          <figure style={{ margin: "2.6em 0" }} data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="onpaper"><img
              src="/assets/yale-s-hartmann-astrolabe.jpg"
              alt="Engraved brass astrolabe, an instrument whose readings can be checked"
              width={1920}
              height={1769}
              loading="lazy"
              style={{ width: "100%", borderRadius: "var(--radius)", display: "block" }}
            /></span>
            <figcaption style={{ marginTop: 10, fontSize: 16, color: "var(--muted)" }}>
              {locale === "zh-hant" ? "黃銅星盤——每一項讀數都可核對。" : "A brass astrolabe: every reading checkable."}
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
  );
}
