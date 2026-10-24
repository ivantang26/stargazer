import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import ContactForm from "@/components/contact-form";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.contact.metaTitle, description: t.contact.metaDescription, alternates: alternatesFor("/contact") };
}

/**
 * Contact: the harbour we answer from on the first screen, the promise — a
 * named owner, a reference number, one business day — beside the form, with
 * the collection's plates in the rail.
 */
export default async function ContactPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  return (
    <div>
      <section className="ihero">
        <div>
          <h1 className="ihero__title" data-reveal>{t.contact.title}</h1>
          <p className="ihero__sub" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            {t.contact.subtitle}
          </p>
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
            style={{ ["--reveal-delay" as string]: "100ms", aspectRatio: "3 / 2", maxWidth: 520 }}
          />
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {locale === "zh-hant" ? "維多利亞港——我們在香港辦公時間內回覆。" : "Victoria Harbour — we reply during Hong Kong business hours."}
          </figcaption>
        </figure>
      </section>

      <section className="formgrid" style={{ paddingTop: 0, paddingBottom: 150 }}>
        <div className="formgrid__rail">
          <h2 className="readgrid__h" data-reveal>{t.contact.nextTitle}</h2>
          <p style={{ marginTop: 18, fontSize: "var(--step-body)", lineHeight: 1.6, maxWidth: "36ch", color: "var(--ink)" }} data-reveal>
            {t.contact.nextBody}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
            src="/assets/kitlv-51w12-spyk-j-van-der-observatoire.jpg"
            alt="Copper engraving of the Peking observatory, 1736"
            width={1920}
            height={1433}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "90ms" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
            src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
            alt="Engraved celestial chart of the constellations, 1660"
            width={1920}
            height={1624}
            loading="lazy"
            data-reveal
            data-drift
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
            style={{ ["--reveal-delay" as string]: "210ms", aspectRatio: "16 / 9", objectFit: "cover" } as React.CSSProperties}
          />
        </div>
        <div data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
          <ContactForm locale={locale} />
        </div>
      </section>
    </div>
  );
}
