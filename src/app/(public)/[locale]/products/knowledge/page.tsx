import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.product.metaTitle, description: t.product.metaDescription, alternates: alternatesFor("/products/knowledge") };
}

/**
 * The product page: the checking instrument (astrolabe) on the first screen,
 * what goes in and what comes out on the two fields, the six capabilities as
 * reading text, the steps on paper, the stated limitations one tone up, the
 * roles as a real table, and the documents fragment on the brass close.
 */
export default async function ProductPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const p = (s: string) => `/${locale}${s}`;
  const yes = zh ? "是" : "Yes";
  const roleRows: Array<[string, string, string, string]> = [
    [zh ? "提問及閱讀共用文件" : "Ask questions and read shared documents", yes, yes, yes],
    [zh ? "管理自己的對話" : "Manage own conversations", yes, yes, yes],
    [zh ? "上載及維護共用文件" : "Upload and maintain shared documents", yes, yes, "—"],
    [zh ? "邀請或移除成員" : "Invite or remove members", yes, yes + "*", "—"],
    [zh ? "指派管理員／轉移擁有權" : "Assign administrators / transfer ownership", yes, "—", "—"],
    [zh ? "查看匯總用量" : "View aggregate usage", yes, yes, zh ? "僅自己" : "Own only"],
    [zh ? "管理帳單／刪除組織" : "Manage billing / delete organization", yes, "—", "—"],
  ];
  return (
    <div>
      <section className="ihero">
        <div>
          <h1 className="ihero__title" data-reveal>{t.product.title}</h1>
          <p className="ihero__sub" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
            {t.product.subtitle}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "140ms" }}>
            <Link href={p("/demo")} className="ps-action">{t.common.tryDemo}</Link>
            <Link href={p("/signup")} className="ps-link">{t.common.startTrial} →</Link>
          </div>
        </div>
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="onpaper"><img
            className="ihero__plate"
            src="/assets/yale-s-hartmann-astrolabe.jpg"
            alt="Engraved brass astrolabe, an instrument whose readings can be checked"
            width={1920}
            height={1769}
            data-reveal
            style={{ ["--reveal-delay" as string]: "100ms", aspectRatio: "1 / 1", maxWidth: 520 }}
          /></span>
          <figcaption className="ihero__caption" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            {zh ? "黃銅星盤——讀數可以逐項核對的儀器。" : "A brass astrolabe: an instrument whose readings you can check."}
          </figcaption>
        </figure>
      </section>

      <div className="iofield">
        <section className="iofield__dark" aria-labelledby="in-h">
          <h2 id="in-h" className="readgrid__h" data-reveal style={{ fontSize: "clamp(26px, 2vw, 32px)" }}>
            {t.product.formatsTitle}
          </h2>
          <p className="iofield__scenario" data-reveal style={{ ["--reveal-delay" as string]: "70ms", marginTop: 22 }}>
            {t.product.formatsBody}
          </p>
        </section>
        <section className="iofield__light" aria-labelledby="out-h">
          <h2 id="out-h" className="readgrid__h" data-reveal style={{ fontSize: "clamp(26px, 2vw, 32px)", color: "var(--ink-on-light)" }}>
            {t.product.outputsTitle}
          </h2>
          <p className="iofield__scenario" data-reveal style={{ ["--reveal-delay" as string]: "70ms", marginTop: 22, color: "var(--muted-on-light)" }}>
            {t.product.outputsBody}
          </p>
          <div className="ui-frag is-on" data-ui data-reveal style={{ ["--reveal-delay" as string]: "140ms", marginTop: 30, background: "#ffffff", color: "#1c2436" }}>
            <div className="ui-q" style={{ background: "#efeeea", color: "#1c2436" }}>
              {zh ? "超過五千港元的採購需要誰批准？" : "Who approves a purchase above HKD 5,000?"}
            </div>
            <p className="ui-a">
              {zh
                ? "超過 HKD 5,000 的採購須由董事總經理書面批准；透過 Orbit 入口的「採購申請」提交，並附上至少兩份報價。"
                : "Purchases above HKD 5,000 require written approval from the Managing Director; submit a Purchase Request Form through the Orbit portal with at least two quotations attached."}
              <span className="ui-cite">1</span>
            </p>
            <div className="ui-src" style={{ background: "#efeeea" }}>
              <span className="ui-cite">1</span>
              <span style={{ color: "#5b6478" }}>
                {zh ? "《採購申請政策》· 第 2 節 · v1" : "Purchase Request Policy · Section 2 · v1"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="faqread" style={{ paddingTop: 120 }}>
        <div>
          <h2 className="readgrid__h" data-reveal>{t.product.featuresTitle}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="readgrid__plate"
            src="/assets/hemelkaart-van-de-banen-van-venus-en.jpg"
            alt="Engraved chart of the orbits of Venus and Mercury, 1660"
            width={1920}
            height={1615}
            loading="lazy"
            data-reveal
            style={{ ["--reveal-delay" as string]: "90ms" }}
          />
        </div>
        <div className="faqread__text md:columns-2 md:gap-14" data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
          {t.product.features.map((f, i) => (
            <p key={i}>
              <b>{f.title}.</b> {f.body}
            </p>
          ))}
        </div>
      </section>

      <section style={{ background: "var(--paper-light)", color: "var(--ink-on-light)", padding: "96px 48px 110px" }}>
        <div className="menu__groups" style={{ columns: 1 }}>
          <h2 className="readgrid__h" data-reveal style={{ color: "var(--ink-on-light)", maxWidth: "20ch" }}>
            {t.product.onboardingTitle}
          </h2>
          <ol data-reveal style={{ ["--reveal-delay" as string]: "90ms", marginTop: 28, maxWidth: "68ch", fontSize: "var(--step-body)", lineHeight: 1.55, color: "var(--ink-on-light)" } as React.CSSProperties}>
            {t.product.onboardingSteps.map((s, i) => (
              <li key={i} style={{ marginBottom: 14, paddingLeft: 6 }}>{s}</li>
            ))}
          </ol>
        </div>
      </section>

      <section style={{ background: "var(--surface)", padding: "88px 48px 104px" }}>
        <div className="menu__groups" style={{ columns: 1 }}>
          <h2 className="readgrid__h" data-reveal style={{ maxWidth: "22ch" }}>
            {t.product.limitationsTitle}
          </h2>
          <ul data-reveal style={{ ["--reveal-delay" as string]: "90ms", marginTop: 28, maxWidth: "72ch", fontSize: "var(--step-body)", lineHeight: 1.6, color: "var(--ink)" } as React.CSSProperties}>
            {t.product.limitations.map((l, i) => (
              <li key={i} style={{ marginBottom: 16, paddingLeft: 6 }}>{l}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="readgrid" style={{ paddingTop: 120 }}>
        <div className="readgrid__rail">
          <h2 className="readgrid__h" data-reveal>{t.product.rolesTitle}</h2>
          <p style={{ marginTop: 18, fontSize: 17, lineHeight: 1.55, color: "var(--muted)", maxWidth: "32ch" }} data-reveal>
            {t.product.rolesNote}
          </p>
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
        </div>
        <div data-reveal style={{ ["--reveal-delay" as string]: "70ms" }}>
          <table className="doctable">
            <thead>
              <tr>
                <th style={{ width: "44%" }}> </th>
                <th>{t.app.team.roleOwner}</th>
                <th>{t.app.team.roleAdmin}</th>
                <th>{t.app.team.roleMember}</th>
              </tr>
            </thead>
            <tbody>
              {roleRows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ textAlign: j === 0 ? "left" : "center" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 14, fontSize: 16, color: "var(--muted)" }}>* {t.app.team.adminNote}</p>
        </div>
      </section>

      <section className="ctagold" style={{ minHeight: "72svh" }}>
        <div className="ctagold__left">
          <h2 className="ctagold__line" data-reveal style={{ fontSize: "clamp(40px, 5.4vw, 88px)" }}>
            {t.product.ctaTitle}
          </h2>
          <p className="ctagold__sentence" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
            {t.product.ctaBody}
          </p>
          <div className="ihero__actions" data-reveal style={{ ["--reveal-delay" as string]: "160ms" }}>
            <Link href={p("/demo")} className="ps-action">{t.common.tryDemo}</Link>
            <Link href={p("/pricing")} className="ps-link" style={{ color: "var(--accent-ink)" }}>{t.nav.pricing} →</Link>
          </div>
        </div>
        <div className="ctagold__right">
          <div className="ctagold__dialog" data-ui data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <h3>{zh ? "文件" : "Documents"}</h3>
            <span className="dl-label">{zh ? "共用文件庫" : "Shared library"}</span>
            <div className="ui-row" style={{ background: "#efeeea" }}>
              <span style={{ color: "#1c2436" }}>{zh ? "《採購申請政策》" : "Purchase Request Policy"}</span>
              <span className="ui-tag ui-tag--ok" style={{ background: "rgba(185, 138, 46, 0.16)", color: "#8a5a10" }}>v2 · {zh ? "已就緒" : "Ready"}</span>
            </div>
            <div className="ui-row" style={{ background: "#efeeea" }}>
              <span style={{ color: "#1c2436" }}>{zh ? "《產品說明：Austria 檯燈》" : "Product Notes: Aurora Desk Lamp"}</span>
              <span className="ui-tag ui-tag--ok" style={{ background: "rgba(185, 138, 46, 0.16)", color: "#8a5a10" }}>v1 · {zh ? "已就緒" : "Ready"}</span>
            </div>
            <div className="ui-row" style={{ background: "#efeeea" }}>
              <span style={{ color: "#1c2436" }}>{zh ? "《保修及維修程序》" : "Warranty and Repair Procedure"}</span>
              <span className="ui-tag ui-tag--ok" style={{ background: "rgba(185, 138, 46, 0.16)", color: "#8a5a10" }}>v1 · {zh ? "已就緒" : "Ready"}</span>
            </div>
            <p style={{ marginTop: 16, fontSize: 15, color: "#9aa3b8" }}>
              {zh ? "取代文件會產生新版本；舊答案保留原有引用。" : "Replacing a document opens a new version; earlier answers keep their references."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
