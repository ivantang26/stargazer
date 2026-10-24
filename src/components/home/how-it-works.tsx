"use client";

import { useEffect, useRef, useState } from "react";
import { dict, type Locale } from "@/lib/i18n";

/**
 * How it works: three statements scroll past a pinned, true-size fragment of
 * the product; the fragment changes state as the nearest statement changes.
 * The fragments are real interface pieces (data-ui), never screenshots.
 */
export default function HowItWorks({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const [active, setActive] = useState(0);
  const itemsRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const els = itemsRef.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const mid = window.innerHeight / 2;
        let best = -1;
        let bestDist = Infinity;
        for (const e of entries) {
          const r = e.boundingClientRect;
          const d = Math.abs(r.top + r.height / 2 - mid);
          if (d < bestDist) {
            bestDist = d;
            best = els.indexOf(e.target as HTMLDivElement);
          }
        }
        if (best >= 0) setActive(best);
      },
      { threshold: [0.2, 0.5, 0.8] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const statements = [
    { line: zh ? "上載核准的文件。" : "Upload the approved documents.", support: t.home.howSteps[0].body },
    { line: zh ? "以英文或繁體中文提問。" : "Ask in English or 繁體中文.", support: t.home.howSteps[1].body },
    { line: zh ? "開啟來源，核實答案。" : "Open the source and check.", support: t.home.howSteps[2].body },
  ];

  return (
    <section className="how" id="how">
      <div className="how__statements">
        <h2 className="how__heading" data-reveal>{t.home.howTitle}</h2>
        {statements.map((s, i) => (
          <div
            key={i}
            className="how__item"
            ref={(el) => {
              itemsRef.current[i] = el;
            }}
            aria-current={active === i ? "step" : undefined}
          >
            <p className="how__line" data-reveal style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}>
              {s.line}
            </p>
            <p className="how__support" data-reveal style={{ ["--reveal-delay" as string]: `${i * 70 + 90}ms` }}>
              {s.support}
            </p>
          </div>
        ))}
      </div>
      <div className="how__stage">
        {/* Fragment 1: the document library, mid-processing */}
        <div className={`ui-frag ${active === 0 ? "is-on" : ""}`} data-ui role="img" aria-label="Document library">
          <p className="ui-frag__title">{zh ? "文件" : "Documents"}</p>
          <div className="ui-row">
            <span>Purchase Request Policy</span>
            <span className="ui-tag ui-tag--ok">{zh ? "就緒 · v3" : "Ready · v3"}</span>
          </div>
          <div className="ui-row">
            <span>Expense Reimbursement Policy</span>
            <span className="ui-tag">{zh ? "處理中 70%" : "Processing 70%"}</span>
          </div>
          <div className="ui-row">
            <span>Annual Leave Policy</span>
            <span className="ui-tag">{zh ? "排隊中" : "Queued"}</span>
          </div>
          <div className="ui-row">
            <span>客戶退款政策</span>
            <span className="ui-tag ui-tag--ok">{zh ? "就緒 · v1" : "Ready · v1"}</span>
          </div>
        </div>
        {/* Fragment 2: the question and its answer */}
        <div className={`ui-frag ${active === 1 ? "is-on" : ""}`} data-ui role="img" aria-label="Answer with citations">
          <p className="ui-frag__title">{zh ? "提問" : "Ask"}</p>
          <div className="ui-q">
            {zh ? "如何提交 6,000 港元的採購申請？" : "How do I submit a purchase request for HKD 6,000?"}
          </div>
          <p className="ui-a">
            {zh
              ? "超過 5,000 港元的採購須由常務董事書面批准。於 Orbit「財務 > 採購申請」提交表格，附至少兩份報價單，三個工作天內處理。"
              : "Purchases above HKD 5,000 require written approval from the Managing Director. Submit the form under Finance > Purchase Requests with at least two quotations; processed within three working days."}
            <span className="ui-cite">1</span>
            <span className="ui-cite">2</span>
          </p>
        </div>
        {/* Fragment 3: the source, opened */}
        <div className={`ui-frag ${active === 2 ? "is-on" : ""}`} data-ui role="img" aria-label="Source passage">
          <p className="ui-frag__title">
            {zh ? "來源 1 · 採購申請政策 v3" : "Source 1 · Purchase Request Policy v3"}
          </p>
          <div className="ui-src">
            <span className="ui-cite">1</span>
            <span>
              {zh ? "第 2 節 · 審批門檻 — " : "Section 2 · Approval thresholds — "}
              {zh
                ? "任何超過 5,000 港元的採購及所有經常性供應商合約，均須常務董事書面批准。"
                : "Any purchase above HKD 5,000, and all recurring vendor contracts, require written approval from the Managing Director."}
            </span>
          </div>
          <div className="ui-src">
            <span className="ui-cite">2</span>
            <span>
              {zh ? "第 3 節 · 提交方法 — " : "Section 3 · How to submit — "}
              {zh
                ? "於 Orbit 入口網站「財務 > 採購申請」提交表格，超過 5,000 港元須附至少兩份報價單。"
                : "Submit a Purchase Request Form through the Orbit portal under Finance > Purchase Requests, attaching at least two quotations above HKD 5,000."}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
