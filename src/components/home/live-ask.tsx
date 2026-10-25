"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, CaretDown, FileText, WarningCircle } from "@phosphor-icons/react";
import { dict, type Locale } from "@/lib/i18n";
import { DEMO_SUGGESTED_QUESTIONS } from "@/lib/demo-data";

interface DemoCitation {
  n: number;
  docTitle: string;
  section: string | null;
  versionNo: number;
  excerpt: string;
}

/**
 * The hero's working panel: a real question box wired to the demo API,
 * answering from the synthetic policies with citations that open their
 * passage. Falls back to the static example answer without script.
 */
export default function LiveAsk({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"complete" | "insufficient">("complete");
  const [citations, setCitations] = useState<DemoCitation[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  const suggestions = (zh ? DEMO_SUGGESTED_QUESTIONS.zh : DEMO_SUGGESTED_QUESTIONS.en).slice(0, 3);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || state === "busy") return;
    setAsked(trimmed);
    setQuestion("");
    setOpen(null);
    setState("busy");
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
      };
      if (!res.ok || !data.ok) {
        setState("error");
        return;
      }
      setAnswer(data.answer ?? "");
      setStatus(data.status ?? "complete");
      setCitations(data.citations ?? []);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="ps-panel overflow-hidden shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-4 border-b border-ps-line px-5 py-3">
        <p className="text-[14px] font-medium text-ps-ink">{t.home.liveLabel}</p>
        <p className="truncate text-[12.5px] text-ps-muted">Northlight Trading Co.</p>
      </div>

      <div className="h-[340px] overflow-y-auto px-5 py-5" aria-live="polite">
        {state === "idle" && (
          <div>
            <p className="text-[14px] text-ps-muted">{t.demo.suggestedTitle}</p>
            <ul className="mt-3 space-y-2">
              {suggestions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => void ask(q)}
                    className="w-full rounded-[var(--r-sm)] border border-ps-line bg-ps-bg px-3.5 py-2.5 text-left text-[14.5px] text-ps-ink transition hover:border-ps-accent active:translate-y-px"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
            <noscript>
              <p className="mt-5 text-[15px] leading-relaxed text-ps-ink">{t.demo.exampleBody}</p>
            </noscript>
          </div>
        )}

        {state !== "idle" && (
          <div className="ml-auto w-fit max-w-[85%] rounded-[var(--r-lg)] rounded-br-[4px] bg-ps-sunk px-3.5 py-2.5 text-[14.5px] text-ps-ink">
            {asked}
          </div>
        )}

        {state === "busy" && (
          <div className="mt-5 space-y-2.5" aria-label={t.demo.asking}>
            <div className="h-3 w-11/12 animate-pulse rounded bg-ps-sunk" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-ps-sunk" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-ps-sunk" />
          </div>
        )}

        {state === "error" && (
          <div className="mt-5 flex gap-3 rounded-[var(--r-sm)] bg-ps-warn-soft p-3.5 text-[14px] text-ps-ink">
            <WarningCircle size={18} className="mt-0.5 shrink-0 text-ps-warn" />
            <div>
              <p>{t.demo.quotaError}</p>
              <Link href={`/${locale}/signup`} className="mt-2 inline-block font-medium text-ps-accent underline underline-offset-4">
                {t.common.startTrial}
              </Link>
            </div>
          </div>
        )}

        {state === "done" && (
          <div className="mt-5">
            {status === "insufficient" && (
              <p className="mb-2 flex items-center gap-1.5 text-[13.5px] font-medium text-ps-warn">
                <WarningCircle size={16} />
                {t.demo.insufficientTitle}
              </p>
            )}
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ps-ink">
              {renderWithCitations(answer)}
            </p>
            {citations.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {citations.map((c) => (
                  <li key={c.n} className="rounded-[var(--r-sm)] bg-ps-sunk">
                    <button
                      type="button"
                      onClick={() => setOpen(open === c.n ? null : c.n)}
                      aria-expanded={open === c.n}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13.5px] text-ps-ink"
                    >
                      <span className="ui-cite !m-0">{c.n}</span>
                      <FileText size={15} className="shrink-0 text-ps-muted" />
                      <span className="min-w-0 flex-1 truncate">
                        {c.docTitle}
                        {c.section ? `, ${c.section}` : ""}
                        <span className="text-ps-muted"> v{c.versionNo}</span>
                      </span>
                      <CaretDown size={14} className={`shrink-0 text-ps-muted transition ${open === c.n ? "rotate-180" : ""}`} />
                    </button>
                    {open === c.n && (
                      <p className="border-t border-ps-line px-3 py-2.5 text-[13.5px] leading-relaxed text-ps-muted">{c.excerpt}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-ps-line bg-ps-bg p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="live-q" className="sr-only">
          {t.demo.inputLabel}
        </label>
        <input
          id="live-q"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.demo.inputPlaceholder}
          maxLength={400}
          className="h-10 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-ps-ink placeholder:text-ps-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "busy" || !question.trim()}
          aria-label={t.home.liveCta}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-ps-accent text-ps-accent-ink transition hover:brightness-110 active:translate-y-px disabled:opacity-40"
        >
          <ArrowUp size={18} weight="bold" />
        </button>
      </form>
    </div>
  );
}

function renderWithCitations(text: string) {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <span key={i} className="ui-cite">
        {m[1]}
      </span>
    );
  });
}
