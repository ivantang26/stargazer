"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";

export interface Citation {
  n: number;
  documentId: string;
  versionId: string;
  docTitle: string;
  versionNo: number;
  section: string | null;
  locLabel: string | null;
  excerpt: string;
  superseded: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  status: string;
  request_id: string | null;
  feedback?: { kind: string } | null;
  created_at: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

export interface AskProps {
  locale: Locale;
  orgName: string;
  conversations: ConversationSummary[];
  documents: Array<{ id: string; title: string }>;
  initialConversationId: string | null;
  canGenerate: boolean;
  readOnly: boolean;
  planName: string;
  trialActive: boolean;
  graceActive: boolean;
  resetDate: string | null;
  remaining: number;
  allowance: number;
}

/** Split an answer into text and inline [n] citation markers. */
function renderAnswer(text: string, citations: Citation[], onOpen: (c: Citation) => void, label: string) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    const n = Number(m[1]);
    const c = citations.find((x) => x.n === n);
    if (!c) return <span key={i}>{part}</span>;
    return (
      <button
        key={i}
        onClick={() => onOpen(c)}
        title={`${label} ${n}: ${c.docTitle}`}
        className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-[11px] font-bold text-white align-super hover:bg-accent-500"
        aria-label={`${label} ${n}`}
      >
        {n}
      </button>
    );
  });
}

export default function AskClient(props: AskProps) {
  const t = dict(props.locale);
  const a = t.app.ask;
  const [conversations, setConversations] = useState(props.conversations);
  const [activeId, setActiveId] = useState<string | null>(props.initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: string; extra?: Record<string, unknown> } | null>(null);
  const [sourcePanel, setSourcePanel] = useState<Citation | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(props.remaining);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef<string>("");

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { ok: boolean; conversation?: { messages: ChatMessage[] } };
    if (data.ok && data.conversation) setMessages(data.conversation.messages);
  }, []);

  useEffect(() => {
    if (activeId) void loadConversation(activeId);
    else setMessages([]);
  }, [activeId, loadConversation]);

  // Poll while a generation is in flight; cancellation competes server-side.
  useEffect(() => {
    const generating = messages.some((m) => m.status === "generating");
    if (!activeId || !generating) return;
    const timer = setInterval(async () => {
      await loadConversation(activeId);
    }, 1200);
    return () => clearInterval(timer);
  }, [messages, activeId, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  async function refreshList() {
    // The conversation list is embedded in the server page; a light refresh via
    // the conversations data in messages keeps the sidebar current.
  }

  async function ask(q: string, regenerate = false) {
    const trimmed = q.trim();
    if (!trimmed || busy) return;
    lastQuestionRef.current = trimmed;
    setBusy(true);
    setBanner(null);
    const idempotencyKey = regenerate ? undefined : undefined;
    const res = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: trimmed,
        conversationId: activeId,
        scopeDocIds: scope === "all" ? null : [scope],
        idempotencyKey,
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      conversationId?: string;
      error?: string;
      resetDate?: string;
      deduplicated?: boolean;
    };
    if (!data.ok) {
      setBanner({ kind: data.error ?? "bad_request", extra: { resetDate: data.resetDate } });
      setBusy(false);
      return;
    }
    const convId = data.conversationId!;
    if (!activeId) setActiveId(convId);
    setConversations((prev) =>
      prev.some((c) => c.id === convId)
        ? prev
        : [{ id: convId, title: trimmed.slice(0, 60), updated_at: new Date().toISOString() }, ...prev]
    );
    await loadConversation(convId);
    setRemaining((r) => Math.max(0, r - 1));
    setQuestion("");
    setBusy(false);
    void refreshList();
  }

  async function cancel(requestId: string | null) {
    if (!requestId) return;
    await fetch("/api/answers/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    if (activeId) await loadConversation(activeId);
  }

  async function copyWithSources(m: ChatMessage) {
    const sources = (m.citations ?? [])
      .map((c) => `[${c.n}] ${c.docTitle}${c.section ? ` · ${c.section}` : ""} (v${c.versionNo})`)
      .join("\n");
    const text = `${m.content}\n\n${t.app.ask.sources}:\n${sources}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  async function deleteConversation(id: string) {
    if (!confirm(a.deleteConversation + "?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function renameConversation(id: string, current: string) {
    const title = prompt(a.renamePrompt, current);
    if (!title) return;
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  const lastUserQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? lastQuestionRef.current;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col lg:h-screen lg:flex-row">
      {/* Conversation list */}
      <div className="w-full shrink-0 border-b border-line bg-white lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="p-3">
          <button
            onClick={() => {
              setActiveId(null);
              setMessages([]);
            }}
            className="btn-secondary w-full !py-2 text-sm"
          >
            + {a.newConversation}
          </button>
          <p className="mt-2 truncate rounded-lg bg-paper px-3 py-2 text-xs text-ink-500">
            {a.orgBadge}: <span className="font-semibold text-navy-900">{props.orgName}</span>
          </p>
        </div>
        <ul className="px-3 pb-3">
          {conversations.map((c) => (
            <li key={c.id} className="group relative">
              <button
                onClick={() => setActiveId(c.id)}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${activeId === c.id ? "bg-navy-900 font-medium text-white" : "text-ink-700 hover:bg-paper"}`}
              >
                {c.title}
              </button>
              <div className="absolute right-1 top-1.5 hidden gap-0.5 group-hover:flex">
                <button onClick={() => void renameConversation(c.id, c.title)} className="rounded p-1 text-xs text-ink-500 hover:bg-white" title={a.renameConversation}>✎</button>
                <button onClick={() => void deleteConversation(c.id)} className="rounded p-1 text-xs text-red-400 hover:bg-white" title={a.deleteConversation}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        {(props.trialActive || props.graceActive || props.readOnly) && (
          <div className={`px-4 py-2.5 text-sm ${props.readOnly ? "bg-amber-100 text-amber-900" : props.graceActive ? "bg-amber-100 text-amber-900" : "bg-accent-500/10 text-navy-900"}`}>
            {props.readOnly ? (
              <>
                <strong>{a.readOnlyTitle}</strong> — {a.readOnlyBody}
              </>
            ) : props.graceActive ? (
              a.graceBanner
            ) : (
              a.trialBanner
            )}
          </div>
        )}
        {banner && (
          <div className="border-b border-line bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {banner.kind === "quota_exceeded" ? (
              <>
                <strong>{a.quotaExhaustedTitle}</strong> — {a.quotaExhaustedBody}{" "}
                {banner.extra?.resetDate ? `(${a.resetsOn} ${String(banner.extra.resetDate).slice(0, 10)})` : null}{" "}
                <Link href="/app/billing" className="font-semibold underline">{a.upgradeCta}</Link>
              </>
            ) : banner.kind === "concurrency_limit" ? (
              <><strong>{a.concurrencyTitle}</strong> — {a.concurrencyBody}</>
            ) : (
              (t.errors as Record<string, string>)[banner.kind] ?? t.errors.bad_request
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center">
                <p className="text-lg font-semibold text-navy-900">{a.title}</p>
                <p className="mt-2 text-sm text-ink-500">{a.placeholder}</p>
                <p className="mt-4 text-xs text-ink-300">{a.privateNote}</p>
              </div>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-navy-900 px-4 py-3 text-[15px] text-white">{m.content}</div>
                </div>
              ) : (
                <div key={m.id} className={`max-w-[92%] rounded-2xl rounded-bl-md border p-4 ${m.status === "insufficient" ? "border-amber-300 bg-amber-50/60" : m.status === "cancelled" || m.status === "failed" ? "border-line bg-paper" : "border-accent-500/30 bg-white"}`}>
                  {m.status === "generating" ? (
                    <div className="space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-ink-300/40" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-ink-300/40" />
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-xs text-ink-500">{a.generating}</span>
                        <button onClick={() => void cancel(m.request_id)} className="text-xs font-semibold text-red-600 hover:underline">
                          {a.cancelGeneration}
                        </button>
                      </div>
                    </div>
                  ) : m.status === "cancelled" ? (
                    <p className="text-sm text-ink-500">{a.cancelledNote}</p>
                  ) : m.status === "failed" ? (
                    <div>
                      <p className="text-sm text-red-700">{a.failedNote}</p>
                    </div>
                  ) : (
                    <>
                      {m.status === "insufficient" && (
                        <p className="mb-1 text-sm font-semibold text-amber-700">{a.insufficient}</p>
                      )}
                      <div className="space-y-3 text-[15px] leading-relaxed text-ink-900">
                        {m.content.split("\n").map((line, i) => (
                          <p key={i}>{renderAnswer(line, m.citations ?? [], (c) => setSourcePanel(c), a.sourceOf)}</p>
                        ))}
                      </div>
                      {(m.citations ?? []).length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {(m.citations ?? []).map((c) => (
                            <button
                              key={c.n}
                              onClick={() => setSourcePanel(c)}
                              className="max-w-full truncate rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-ink-700 hover:border-accent-500/50"
                            >
                              <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent-600 text-[10px] font-bold text-white">{c.n}</span>
                              {c.docTitle}
                              {c.superseded && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">⚠</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs">
                        <button onClick={() => void copyWithSources(m)} className="btn-ghost !px-2 !py-1 text-xs">
                          {copiedId === m.id ? t.common.copied : a.copyAnswer}
                        </button>
                        {activeId && (
                          <a href={`/api/conversations/${activeId}/export`} className="btn-ghost !px-2 !py-1 text-xs">{a.exportConversation}</a>
                        )}
                        <button
                          onClick={() => void ask(lastUserQuestion, true)}
                          disabled={busy || !props.canGenerate}
                          title={a.regenerateNote}
                          className="btn-ghost !px-2 !py-1 text-xs"
                        >
                          {a.regenerate}
                        </button>
                        {feedbackFor === m.id ? (
                          <span className="flex flex-wrap items-center gap-1.5 rounded-lg bg-paper px-2 py-1">
                            {(Object.entries(a.feedbackKinds) as Array<[string, string]>).map(([kind, label]) => (
                              <button
                                key={kind}
                                onClick={async () => {
                                  await fetch(`/api/messages/${m.id}/feedback`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ kind }),
                                  });
                                  setFeedbackFor(null);
                                  if (activeId) await loadConversation(activeId);
                                }}
                                className="rounded border border-line bg-white px-2 py-0.5 hover:border-accent-500/50"
                              >
                                {label}
                              </button>
                            ))}
                            <button onClick={() => setFeedbackFor(null)} className="px-1 text-ink-500">✕</button>
                          </span>
                        ) : (
                          <button onClick={() => setFeedbackFor(m.id)} className="btn-ghost !px-2 !py-1 text-xs">
                            ⚑ {a.feedbackTitle}
                          </button>
                        )}
                        {m.feedback && <span className="text-green-700">{a.feedbackThanks}</span>}
                      </div>
                    </>
                  )}
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <form
          className="border-t border-line bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <label htmlFor="ask-scope" className="text-xs font-semibold text-ink-500">{a.scopeLabel}</label>
              <select
                id="ask-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="max-w-[280px] rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm"
              >
                <option value="all">{a.scopeAll} ({props.documents.length})</option>
                {props.documents.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
              <span className="ml-auto text-xs text-ink-500">{remaining}/{props.allowance}</span>
            </div>
            <div className="flex gap-3">
              <label htmlFor="ask-q" className="sr-only">{a.title}</label>
              <input
                id="ask-q"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={a.placeholder}
                className="input"
                maxLength={2000}
                disabled={busy || !props.canGenerate}
              />
              <button type="submit" disabled={busy || !question.trim() || !props.canGenerate} className="btn-primary shrink-0">
                {busy ? a.generating : a.send}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Source panel */}
      {sourcePanel && (
        <>
          <div className="fixed inset-0 z-40 bg-navy-950/30 lg:hidden" onClick={() => setSourcePanel(null)} aria-hidden="true" />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-line bg-white p-6 shadow-card lg:static lg:z-auto lg:w-96 lg:shrink-0 lg:shadow-none" role="dialog" aria-label={a.sources}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{a.sourceOf} {sourcePanel.n}</p>
                <h2 className="mt-1 text-lg font-bold text-navy-900">{sourcePanel.docTitle}</h2>
                <p className="mt-1 text-xs text-ink-500">
                  {a.versionLabel}{sourcePanel.versionNo}
                  {sourcePanel.section ? ` · ${sourcePanel.section}` : ""}
                  {sourcePanel.locLabel ? ` · ${sourcePanel.locLabel}` : ""}
                </p>
              </div>
              <button onClick={() => setSourcePanel(null)} className="btn-ghost !px-2" aria-label={t.common.close}>✕</button>
            </div>
            {sourcePanel.superseded && (
              <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                ⚠ {a.outdated}
              </p>
            )}
            <blockquote className="mt-5 whitespace-pre-wrap rounded-xl border border-line bg-paper p-4 text-[14px] leading-relaxed text-ink-700">
              {sourcePanel.excerpt}
            </blockquote>
          </aside>
        </>
      )}
    </div>
  );
}
