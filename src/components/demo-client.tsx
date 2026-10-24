"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { DEMO_SUGGESTED_QUESTIONS } from "@/lib/demo-data";

export interface DemoCitation {
  n: number;
  documentId: string;
  versionId: string;
  docTitle: string;
  versionNo: number;
  section: string | null;
  excerpt: string;
}

interface DemoEntry {
  question: string;
  answer: string;
  status: "complete" | "insufficient";
  citations: DemoCitation[];
}

export default function DemoClient({ locale, initialRemaining }: { locale: Locale; initialRemaining: number }) {
  const t = dict(locale);
  const [entries, setEntries] = useState<DemoEntry[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [error, setError] = useState("");
  const [openCitation, setOpenCitation] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length, busy]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || busy || remaining <= 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/demo/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        answer?: string;
        status?: "complete" | "insufficient";
        citations?: DemoCitation[];
        remaining?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "rate_limited");
        setBusy(false);
        return;
      }
      setEntries((prev) => [
        ...prev,
        { question: trimmed, answer: data.answer ?? "", status: data.status ?? "complete", citations: data.citations ?? [] },
      ]);
      setRemaining(data.remaining ?? remaining - 1);
      setQuestion("");
    } catch {
      setError("provider_unavailable");
    }
    setBusy(false);
  }

  const suggestions =
    locale === "zh-hant"
      ? [...DEMO_SUGGESTED_QUESTIONS.zh, ...DEMO_SUGGESTED_QUESTIONS.en.slice(0, 2)]
      : [...DEMO_SUGGESTED_QUESTIONS.en, ...DEMO_SUGGESTED_QUESTIONS.zh.slice(0, 2)];

  return (
    <>
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="ui-frag !w-full !p-0" data-ui data-reveal style={{ display: "block" }}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <p className="text-[16px] text-[var(--muted)]">{t.demo.datasetLabel}</p>
            <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[15px] font-semibold text-[var(--ink)]">
              {remaining} {t.demo.remaining}
            </span>
          </div>

          <div className="max-h-[540px] space-y-5 overflow-y-auto p-5" aria-live="polite">
            {entries.length === 0 && !busy && (
              <div className="rounded-xl border border-dashed border-[var(--surface-2)] bg-[var(--bg)] p-6 text-center text-[17px]" style={{ color: "var(--ink)" }}>
                {t.demo.subtitle}
              </div>
            )}
            {entries.map((entry, i) => (
              <div key={i} className="space-y-3">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--surface-2)] px-4 py-3 text-[16px] text-[var(--ink)]">
                  {entry.question}
                </div>
                <div className={`max-w-[92%] rounded-2xl rounded-bl-md border p-4 ${entry.status === "insufficient" ? "border-[#4d442c] bg-[#332d1f]" : "border-accent-500/30 bg-[var(--surface)]"}`}>
                  <p className="text-[16px] text-[var(--muted)]">{t.demo.answerLabel}</p>
                  {entry.status === "insufficient" && (
                    <p className="mt-1 text-[16px] font-semibold text-[#e3c788]">{t.demo.insufficientTitle}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-[16.5px] leading-relaxed text-[var(--ink)]">{entry.answer}</p>
                  {entry.citations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {entry.citations.map((c) => {
                        const key = `${i}-${c.n}`;
                        const open = openCitation === key;
                        return (
                          <div key={key} className="rounded-lg border border-[var(--surface-2)] bg-[var(--bg)]">
                            <button
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[16px] text-[var(--muted)]"
                              onClick={() => setOpenCitation(open ? null : key)}
                              aria-expanded={open}
                            >
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-600 text-[13px] font-bold text-[var(--ink)]">
                                {c.n}
                              </span>
                              <span className="flex-1 font-medium">{c.docTitle}{c.section ? ` · ${c.section}` : ""} · v{c.versionNo}</span>
                              <span className="font-semibold text-accent-600">{open ? t.demo.hidePassage : t.demo.openPassage}</span>
                            </button>
                            {open && (
                              <p className="border-t border-[var(--surface-2)] bg-[var(--surface)] px-3.5 py-3 text-[16px] leading-relaxed text-[var(--muted)]" /* taste-skill-ignore hairline: inside the product chat fragment */>
                                {c.excerpt}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="max-w-[60%] space-y-2 rounded-2xl rounded-bl-md border border-[var(--surface-2)] bg-[var(--bg)] p-4">
                <div className="h-3 w-3/4 animate-pulse rounded bg-ink-300/40" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-ink-300/40" />
                <p className="pt-1 text-[16px] text-[var(--muted)]">{t.demo.asking}</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {remaining > 0 ? (
            <form
              className="flex gap-3 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void ask(question);
              }}
            >
              <label htmlFor="demo-q" className="sr-only">{t.demo.inputLabel}</label>
              <input
                id="demo-q"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t.demo.inputPlaceholder}
                className="input"
                maxLength={500}
                disabled={busy}
              />
              <button type="submit" disabled={busy || !question.trim()} className="btn-primary shrink-0">
                {busy ? t.demo.asking : t.demo.ask}
              </button>
            </form>
          ) : (
            <div className="border-t border-[var(--surface-2)] bg-[var(--surface)] p-5" /* taste-skill-ignore hairline: inside the product chat fragment */>
              <p className="font-semibold text-[var(--ink)]">{t.demo.exhaustedTitle}</p>
              <p className="mt-1 text-[16px] text-[var(--muted)]">{t.demo.exhaustedBody}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/${locale}/signup`} className="btn-primary">{t.common.startTrial}</Link>
                <Link href={`/${locale}/signin`} className="btn-secondary">{t.demo.signInPrompt}</Link>
              </div>
            </div>
          )}
          {error && (
            <p className="bg-[#3a2426] px-5 py-3 text-[16px] text-[#e8a0a0]" role="alert">
              {t.demo.quotaError}
            </p>
          )}
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-2xl bg-[var(--surface)] p-5" data-reveal style={{ ["--reveal-delay" as string]: "60ms" }}>
          <h2 className="text-[16px] font-semibold text-[var(--ink)]">{t.demo.suggestedTitle}</h2>
          <ul className="mt-3 space-y-2" data-ui data-reveal style={{ ["--reveal-delay" as string]: "90ms" } as React.CSSProperties}>
            {suggestions.map((q, i) => (
              <li key={i}>
                <button
                  className="w-full rounded-lg bg-[var(--surface-2)] px-3.5 py-2.5 text-left text-[16px] transition hover:brightness-110 disabled:opacity-50" style={{ color: "var(--ink)" }}
                  onClick={() => void ask(q)}
                  disabled={busy || remaining <= 0}
                  lang={/[^\x00-\x7F]/.test(q) ? "zh-Hant" : "en"}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-[var(--surface)] p-5" data-reveal style={{ ["--reveal-delay" as string]: "240ms" }}>
          <h2 className="font-bold text-[var(--ink)]">{t.demo.disclaimerTitle}</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-[var(--muted)]">{t.demo.disclaimerBody}</p>
        </div>
      </aside>
    </div>
    <div className="mt-10 grid gap-6 sm:grid-cols-2">
      <figure data-reveal>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
          alt="Engraved celestial chart of the constellations, 1660"
          width={1920}
          height={1624}
          loading="lazy"
          className="w-full rounded-xl"
        />
        <figcaption className="mt-2 text-[16px] text-[var(--muted)]">
          {t.demo.datasetLabel}
        </figcaption>
      </figure>
      <figure data-reveal style={{ ["--reveal-delay" as string]: "90ms" }}>
        <video
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          poster="/assets/starry-sky-with-north-star-circled-poster.jpg"
          className="w-full rounded-xl"
        >
          <source src="/assets/starry-sky-with-north-star-circled.webm" type="video/webm" />
        </video>
        <figcaption className="mt-2 text-[16px] text-[var(--muted)]">{t.home.videoCaption}</figcaption>
      </figure>
    </div>
    </>
  );
}
