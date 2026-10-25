"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { ChatCircleText, FileText, WarningCircle } from "@phosphor-icons/react";
import { DEMO_SUGGESTED_QUESTIONS } from "@/lib/demo-data";
import CitedText from "@/components/cited-text";

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
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="ps-panel flex flex-col overflow-hidden shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ps-line px-5 py-3">
          <p className="text-[13.5px] text-ps-muted">{t.demo.datasetLabel}</p>
          <span className="rounded-full bg-ps-sunk px-2.5 py-0.5 font-mono text-[12.5px] text-ps-ink">
            {remaining} {t.demo.remaining}
          </span>
        </div>

        <div className="h-[520px] space-y-6 overflow-y-auto p-5" aria-live="polite">
          {entries.length === 0 && !busy && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ChatCircleText size={28} className="text-ps-muted" />
              <p className="mt-3 max-w-[40ch] text-[15px] text-ps-muted">{t.demo.emptyHint}</p>
            </div>
          )}
          {entries.map((entry, i) => (
            <div key={i} className="space-y-3">
              <div className="ml-auto w-fit max-w-[85%] rounded-[var(--r-lg)] rounded-br-[4px] bg-ps-sunk px-4 py-2.5 text-[15px] text-ps-ink">
                {entry.question}
              </div>
              <div className="max-w-[92%]">
                {entry.status === "insufficient" && (
                  <p className="mb-1.5 flex items-center gap-1.5 text-[13.5px] font-medium text-ps-warn">
                    <WarningCircle size={16} />
                    {t.demo.insufficientTitle}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-[15.5px] leading-relaxed text-ps-ink">
                  <CitedText text={entry.answer} />
                </p>
                {entry.citations.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {entry.citations.map((c) => {
                      const key = `${i}-${c.n}`;
                      const open = openCitation === key;
                      return (
                        <li key={key} className="rounded-[var(--r-sm)] bg-ps-sunk">
                          <button
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] text-ps-ink"
                            onClick={() => setOpenCitation(open ? null : key)}
                            aria-expanded={open}
                          >
                            <span className="ui-cite !m-0">{c.n}</span>
                            <FileText size={15} className="shrink-0 text-ps-muted" />
                            <span className="min-w-0 flex-1 truncate">
                              {c.docTitle}
                              {c.section ? `, ${c.section}` : ""}
                              <span className="text-ps-muted"> v{c.versionNo}</span>
                            </span>
                            <span className="shrink-0 text-[13px] font-medium text-ps-accent">
                              {open ? t.demo.hidePassage : t.demo.openPassage}
                            </span>
                          </button>
                          {open && (
                            <p className="border-t border-ps-line px-3.5 py-3 text-[14px] leading-relaxed text-ps-muted">
                              {c.excerpt}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="max-w-[60%] space-y-2.5" aria-label={t.demo.asking}>
              <div className="h-3 w-full animate-pulse rounded bg-ps-sunk" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-ps-sunk" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-ps-sunk" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="flex items-center gap-2 border-t border-ps-line bg-ps-danger-soft px-5 py-3 text-[14px] text-ps-danger" role="alert">
            <WarningCircle size={16} className="shrink-0" />
            {t.demo.quotaError}
          </p>
        )}

        {remaining > 0 ? (
          <form
            className="flex gap-2 border-t border-ps-line bg-ps-bg p-3"
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
          <div className="border-t border-ps-line bg-ps-bg p-5">
            <p className="font-semibold text-ps-ink">{t.demo.exhaustedTitle}</p>
            <p className="mt-1 text-[15px] text-ps-muted">{t.demo.exhaustedBody}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/${locale}/signup`} className="btn-primary">{t.common.startTrial}</Link>
              <Link href={`/${locale}/signin`} className="btn-secondary">{t.demo.signInPrompt}</Link>
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="ps-panel p-5">
          <h2 className="text-[14px] font-semibold text-ps-ink">{t.demo.suggestedTitle}</h2>
          <ul className="mt-3 space-y-2">
            {suggestions.map((q, i) => (
              <li key={i}>
                <button
                  className="w-full rounded-[var(--r-sm)] border border-ps-line bg-ps-bg px-3.5 py-2.5 text-left text-[14px] text-ps-ink transition hover:border-ps-accent active:translate-y-px disabled:opacity-50"
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
        <div className="rounded-[var(--r-lg)] bg-ps-sunk p-5">
          <h2 className="text-[14px] font-semibold text-ps-ink">{t.demo.disclaimerTitle}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ps-muted">{t.demo.disclaimerBody}</p>
        </div>
      </aside>
    </div>
  );
}
