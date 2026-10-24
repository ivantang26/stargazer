import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import CitedText from "@/components/cited-text";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.solutionsSupport.metaTitle, description: t.solutionsSupport.metaDescription, alternates: alternatesFor("/solutions/support") };
}

/**
 * Support workflow: the atlas on the first screen, the customer's question on
 * the dark field, and on paper the two approved documents the agent compares —
 * the product note and the warranty procedure — with the answer they add up
 * to, and what the human still reviews.
 */
export default async function SupportSolutionPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const s = t.solutionsSupport;
  const p = (x: string) => `/${locale}${x}`;
  return (
    <div>
      <section className="ihero">
        <div>
          <h1 className="ihero__title" data-reveal>{s.title}</h1>
          <p className="ihero__sub" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            {s.subtitle}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/demo")} className="ps-action">{s.cta}</Link>
            <Link href={p("/signup")} className="ps-link">{t.common.startTrial} →</Link>
          </div>
        </div>
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ihero__plate"
            src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
            alt="Engraved celestial chart of the constellations, 1660"
            width={1920}
            height={1624}
            data-reveal
            style={{ ["--reveal-delay" as string]: "100ms", }}
          />
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {locale === "zh-hant" ? "星座圖——把眾多定位整合成一張可查的地圖。" : "A celestial chart: many positions brought into one checkable map."}
          </figcaption>
        </figure>
      </section>

      <div className="iofield">
        <section className="iofield__dark" aria-labelledby="sup-q-h">
          <h2 id="sup-q-h" className="iofield__label" data-reveal>{s.scenarioLabel}</h2>
          <p style={{ fontSize: "var(--step-body)", lineHeight: 1.6, maxWidth: "40ch", color: "var(--ink)", marginTop: 20 }} data-reveal>
            {s.scenario}
          </p>
          <p className="iofield__q" data-reveal style={{ ["--reveal-delay" as string]: "90ms" }}>
            {s.question}
          </p>
        </section>
        <section className="iofield__light" aria-labelledby="sup-a-h">
          <p className="iofield__label" data-reveal>{s.answerLabel}</p>
          <div className="ui-frag is-on" data-ui data-reveal style={{ ["--reveal-delay" as string]: "90ms", background: "#ffffff", color: "#1c2436", width: "min(100%, 560px)" }}>
            <p className="ui-a" style={{ marginBottom: 12 }}>
              <CitedText text={s.answer[0]} />
            </p>
            <div className="ui-src" style={{ background: "#efeeea", marginTop: 4 }}>
              <span className="ui-cite">1</span>
              <span style={{ color: "#5b6478" }}>{s.source1}</span>
            </div>
            <p className="ui-a" style={{ marginBottom: 12, marginTop: 18 }}>
              <CitedText text={s.answer[1]} />
            </p>
            <div className="ui-src" style={{ background: "#efeeea", marginTop: 4 }}>
              <span className="ui-cite">2</span>
              <span style={{ color: "#5b6478" }}>{s.source2}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="readgrid" style={{ paddingTop: 130 }}>
        <div className="readgrid__rail">
          <h2 className="readgrid__h" data-reveal>{s.reviewTitle}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="onpaper"><img
            className="readgrid__plate"
            src="/assets/yale-s-hartmann-astrolabe.jpg"
            alt="Engraved brass astrolabe, an instrument whose readings can be checked"
            width={1920}
            height={1769}
            loading="lazy"
            data-reveal
            data-drift
            style={{ ["--reveal-delay" as string]: "90ms" }}
          /></span>
        </div>
        <div className="readgrid__text">
          <p data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>{s.reviewBody}</p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/demo")} className="ps-action">{s.cta}</Link>
          </div>
          <figure style={{ margin: "44px 0 0" }} data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/starry-sky-with-north-star-circled-poster.jpg"
              alt="Stars turning about the celestial pole"
              width={1280}
              height={720}
              loading="lazy"
              style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "var(--radius)", display: "block" }}
            />
            <figcaption style={{ marginTop: 10, fontSize: 16, color: "var(--muted)" }}>
              {locale === "zh-hant" ? "眾星繞北極星而行。" : "The stars turning about the pole."}
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
  );
}
