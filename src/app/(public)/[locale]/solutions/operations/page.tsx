import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import CitedText from "@/components/cited-text";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.solutionsOps.metaTitle, description: t.solutionsOps.metaDescription, alternates: alternatesFor("/solutions/operations") };
}

/**
 * Operations workflow: the orbit chart on the first screen, the employee's
 * question on the dark field, the cited answer on paper, and what the human
 * still reviews beside the observatory plate.
 */
export default async function OperationsPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const s = t.solutionsOps;
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
            src="/assets/hemelkaart-van-de-banen-van-venus-en.jpg"
            alt="Engraved chart of the orbits of Venus and Mercury, 1660"
            width={1920}
            height={1615}
            data-reveal
            style={{ ["--reveal-delay" as string]: "100ms", aspectRatio: "1 / 1", }}
          />
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {locale === "zh-hant" ? "金星與水星的軌道圖，1660 年。" : "The orbits of Venus and Mercury, engraved 1660."}
          </figcaption>
        </figure>
      </section>

      <div className="iofield">
        <section className="iofield__dark" aria-labelledby="ops-q-h">
          <h2 id="ops-q-h" className="iofield__label" data-reveal>{s.scenarioLabel}</h2>
          <p style={{ fontSize: "var(--step-body)", lineHeight: 1.6, maxWidth: "40ch", color: "var(--ink)", marginTop: 20 }} data-reveal>
            {s.scenario}
          </p>
          <p className="iofield__q" data-reveal style={{ ["--reveal-delay" as string]: "90ms" }}>
            {s.question}
          </p>
        </section>
        <section className="iofield__light" aria-labelledby="ops-a-h">
          <p className="iofield__label" data-reveal>{s.answerLabel}</p>
          <div className="ui-frag is-on" data-ui data-reveal style={{ ["--reveal-delay" as string]: "90ms", background: "#ffffff", color: "#1c2436", width: "min(100%, 560px)" }}>
            {s.answer.map((a, i) => (
              <p key={i} className="ui-a" style={{ marginBottom: 12 }}>
                <CitedText text={a} />
              </p>
            ))}
            {[s.source1, s.source2].map((src, i) => (
              <div key={i} className="ui-src" style={{ background: "#efeeea", marginTop: i === 0 ? 14 : 8 }}>
                <span className="ui-cite">{i + 1}</span>
                <span style={{ color: "#5b6478" }}>{src}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="readgrid" style={{ paddingTop: 130 }}>
        <div className="readgrid__rail">
          <h2 className="readgrid__h" data-reveal>{s.reviewTitle}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
            src="/assets/kitlv-51w12-spyk-j-van-der-observatoire.jpg"
            alt="Copper engraving of the Peking observatory with its brass instruments, 1736"
            width={1920}
            height={1433}
            loading="lazy"
            data-reveal
            data-drift
            style={{ ["--reveal-delay" as string]: "90ms" }}
          />
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
