"use client";

import { useState } from "react";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";

interface DemoCitation {
  n: number;
  docTitle: string;
  section: string | null;
  versionNo: number;
  excerpt: string;
}

/**
 * The one live thing: type a question on the dark half, and the light half
 * returns a real answer from the demo's synthetic policies — citations and
 * all. Real content, thumb-sized on a phone, a plain static fallback without
 * script, and it never blocks reading.
 */
export default function LiveAsk({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const [question, setQuestion] = useState(
    zh ? "超過五千港元的採購需要誰批准？" : "Who approves a purchase above HKD 5,000?"
  );
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"complete" | "insufficient">("complete");
  const [citations, setCitations] = useState<DemoCitation[]>([]);
  const [errorKind, setErrorKind] = useState("");

  const fallbackAnswer = t.demo.exampleBody;

  async function ask() {
    if (!question.trim() || state === "busy") return;
    setState("busy");
    setErrorKind("");
    try {
      const res = await fetch("/api/demo/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        answer?: string;
        status?: "complete" | "insufficient";
        citations?: DemoCitation[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorKind(data.error ?? "rate_limited");
        setState("error");
        return;
      }
      setAnswer(data.answer ?? "");
      setStatus(data.status ?? "complete");
      setCitations(data.citations ?? []);
      setState("done");
    } catch {
      setErrorKind("provider_unavailable");
      setState("error");
    }
  }

  return (
    <section className="liveask" id="try" aria-labelledby="liveask-h">

      <div className="liveask__in">
        <h2 id="liveask-h" className="text-[20px] font-medium" style={{ color: "var(--muted)" }}>
          {t.home.liveLabel}
        </h2>
        <textarea
          id="live-q"
          className="liveask__field"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask();
            }
          }}
          maxLength={400}
        />
        <div className="liveask__send">
          <button className="ps-action" onClick={() => void ask()} disabled={state === "busy"}>
            {state === "busy" ? t.demo.asking : t.home.liveCta}
          </button>
        </div>
        <p className="mt-6 max-w-[38ch] text-[16px]" style={{ color: "var(--muted)" }}>
          {t.home.liveHint}
        </p>
        <p className="liveask__h-in" data-reveal aria-hidden="true">
          {t.home.showcaseQ}
        </p>
      </div>
      <div className="liveask__out">
        {state === "idle" && (
          <p className="liveask__status">
            {zh
              ? "在左邊輸入問題，答案會在這裏出現——連引用一起。"
              : "Type on the dark half; the answer arrives here, sources and all."}
          </p>
        )}
        {state === "busy" && (
          <p className="liveask__status" aria-live="polite">
            {t.demo.asking}
          </p>
        )}
        {state === "error" && (
          <div className="liveask__status">
            <p>{t.demo.quotaError}</p>
            <Link href={`/${locale}/signup`} className="mt-4 inline-block font-semibold underline decoration-1 underline-offset-4" style={{ color: "var(--ink-on-light)" }}>
              {t.common.startTrial} →
            </Link>
          </div>
        )}
        {state === "done" && (
          <div data-reveal>
            {status === "insufficient" && (
              <p className="mb-3 text-[17px] font-semibold" style={{ color: "#8a5a10" }}>
                {t.demo.insufficientTitle}
              </p>
            )}
            <div className="liveask__answer" aria-live="polite">
              {renderWithCitations(answer, citations)}
            </div>
            {citations.length > 0 && (
              <div className="liveask__sources">
                {citations.map((c) => (
                  <details key={c.n} className="liveask__src">
                    <summary>
                      [{c.n}] {c.docTitle}
                      {c.section ? ` · ${c.section}` : ""} · v{c.versionNo}
                    </summary>
                    <p className="mt-2 text-[14px] leading-relaxed">{c.excerpt}</p>
                  </details>
                ))}
              </div>
            )}
            <p className="liveask__note">
              {t.demo.datasetLabel} ·{" "}
              <button
                className="font-semibold underline decoration-1 underline-offset-4"
                style={{ color: "var(--ink-on-light)" }}
                onClick={() => {
                  setState("idle");
                  setQuestion("");
                }}
              >
                {t.home.liveReset}
              </button>
            </p>
          </div>
        )}
        <noscript>
          <p className="liveask__answer">{fallbackAnswer}</p>
        </noscript>
        <p className="liveask__h-out" data-reveal aria-hidden="true">
          {t.home.showcaseA}
        </p>
      </div>
    </section>
  );
}

function renderWithCitations(text: string, citations: DemoCitation[]) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    const n = Number(m[1]);
    const c = citations.find((x) => x.n === n);
    return (
      <span
        key={i}
        title={c ? `${c.docTitle}${c.section ? ` · ${c.section}` : ""}` : undefined}
        className="ui-cite"
      >
        {n}
      </span>
    );
  });
}
