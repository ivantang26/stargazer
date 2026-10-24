"use client";

import { useState } from "react";
import { dict, type Locale } from "@/lib/i18n";

/**
 * The close: the product's first screen already open on a full field of the
 * accent colour. The dialog accepts typing, the language switches, and the
 * one button carries the typed name into sign-up (held in sessionStorage
 * until the workspace is created).
 */
export default function CtaGold({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const [name, setName] = useState(zh ? "北光貿易" : "Northlight Trading");
  const [lang, setLang] = useState<"en" | "zh-hant">(locale);

  function go() {
    try {
      if (name.trim()) sessionStorage.setItem("sg_ws_name", name.trim());
      sessionStorage.setItem("sg_ws_locale", lang);
    } catch {
      // storage unavailable — sign-up still works
    }
    window.location.href = `/${lang}/signup`;
  }

  return (
    <section className="ctagold">
      <div className="ctagold__left">
        <p className="ctagold__line" data-reveal>
          {t.home.ctaLine1}
          <br />
          {t.home.ctaLine2}
        </p>
        <p className="ctagold__sentence" data-reveal style={{ ["--reveal-delay" as string]: "90ms" }}>
          {t.home.ctaSentence}
        </p>
      </div>
      <div className="ctagold__right">
        <div className="ctagold__dialog" data-ui role="group" aria-label={t.home.ctaDialog}>
          <h3>{t.home.ctaDialog}</h3>
          <label className="dl-label" htmlFor="cta-ws">
            {zh ? "工作區名稱" : "Workspace name"}
          </label>
          <input
            id="cta-ws"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
          <span className="dl-label">{t.home.ctaDialogLang}</span>
          <div className="ctagold__seg" role="group" aria-label={t.home.ctaDialogLang}>
            <button
              type="button"
              className={lang === "en" ? "is-on" : ""}
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
            >
              English
            </button>
            <button
              type="button"
              className={lang === "zh-hant" ? "is-on" : ""}
              onClick={() => setLang("zh-hant")}
              aria-pressed={lang === "zh-hant"}
            >
              繁體中文
            </button>
          </div>
          <button type="button" className="ctagold__go" onClick={go}>
            {t.home.ctaGo}
          </button>
        </div>
      </div>
    </section>
  );
}
