"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dict, type Locale } from "@/lib/i18n";

export interface DocRow {
  id: string;
  title: string;
  filename: string;
  ext: string;
  state: string;
  error: string | null;
  created_at: string;
  version_no: number | null;
  char_count: number | null;
  page_count: number | null;
  size_bytes: number | null;
  has_history: number;
}

export default function DocumentsClient({
  locale,
  documents,
  canUpload,
  storageUsedMb,
  storageLimitMb,
  docCount,
  docLimit,
  isAdmin,
}: {
  locale: Locale;
  documents: DocRow[];
  canUpload: boolean;
  storageUsedMb: number;
  storageLimitMb: number;
  docCount: number;
  docLimit: number;
  isAdmin: boolean;
}) {
  const t = dict(locale);
  const d = t.app.documents;
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);
  const [duplicate, setDuplicate] = useState<{ file: File; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocRow | null>(null);
  const [replaceFor, setReplaceFor] = useState<DocRow | null>(null);

  async function upload(file: File, opts?: { replaceDocumentId?: string; forceReplace?: boolean }) {
    setUploading(true);
    setNotice(null);
    const fd = new FormData();
    fd.append("file", file);
    if (opts?.replaceDocumentId) fd.append("replaceDocumentId", opts.replaceDocumentId);
    if (opts?.forceReplace) fd.append("duplicate", "replace");
    const res = await fetch("/api/documents", { method: "POST", body: fd });
    const data = (await res.json()) as { ok: boolean; error?: string; message?: string };
    setUploading(false);
    if (!data.ok) {
      if (data.error === "duplicate_checksum") {
        setDuplicate({ file, message: data.message ?? d.duplicateBody });
      } else {
        setNotice({ kind: "err", text: data.message ?? ((t.errors as Record<string, string>)[data.error ?? ""] ?? t.errors.bad_request) });
      }
      return;
    }
    setNotice({ kind: "ok", text: d.processingHint });
    // Advance onboarding to the processing step on first upload.
    await fetch("/api/orgs/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "onboarding_step", step: "processing" }),
    });
    router.refresh();
    setTimeout(() => router.refresh(), 2500);
  }

  async function retry(id: string) {
    await fetch(`/api/documents/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    setNotice({ kind: "ok", text: d.processingHint });
    router.refresh();
    setTimeout(() => router.refresh(), 2500);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/documents/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete" }),
    });
    const data = (await res.json()) as { ok: boolean; conversationsDeleted?: number };
    setConfirmDelete(null);
    if (data.ok) {
      setNotice({ kind: "warn", text: `${d.delete} ✓${data.conversationsDeleted ? `. ${d.deleteConfirmNote} ${data.conversationsDeleted}` : ""}` });
      router.refresh();
    }
  }

  async function download(id: string) {
    const res = await fetch(`/api/documents/${id}/link`, { method: "POST" });
    const data = (await res.json()) as { ok: boolean; url?: string };
    if (data.ok && data.url) window.location.href = data.url;
  }

  const stateBadge = (state: string) => {
    const labels = d.states as Record<string, string>;
    const cls =
      state === "ready" ? "bg-green-100 text-green-800"
      : state === "failed" ? "bg-red-100 text-red-800"
      : state === "deleting" ? "bg-ink-300/40 text-ink-700"
      : "bg-amber-100 text-amber-800";
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{labels[state] ?? state}</span>;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-navy-900">{d.title}</h1>
      <p className="mt-1 text-sm text-ink-500">{d.subtitle}</p>

      {isAdmin ? (
        <section className="card mt-8 p-6">
          <h2 className="font-bold text-navy-900">{d.uploadTitle}</h2>
          <p className="mt-1 text-xs text-ink-500">{d.limitsNote}</p>
          <p className="mt-2 rounded-lg border border-line bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            ⚠ {d.visibilityNote}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <button
              className="btn-primary"
              disabled={!canUpload || uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? d.uploading : d.uploadCta}
            </button>
            <span className="text-xs text-ink-500">
              {d.docCountUsed}: {docCount}/{docLimit} · {d.storageUsed}: {storageUsedMb.toFixed(1)}/{storageLimitMb >= 1024 ? `${storageLimitMb / 1024} GB` : `${storageLimitMb} MB`}
            </span>
          </div>
        </section>
      ) : (
        <p className="mt-6 rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink-700">
          {t.product.rolesNote}
        </p>
      )}

      {notice && (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm ${notice.kind === "ok" ? "border-green-200 bg-green-50 text-green-800" : notice.kind === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`} role="status">
          {notice.text}
        </p>
      )}

      {duplicate && (
        <div className="card mt-4 border-amber-300 p-5">
          <p className="font-semibold text-navy-900">{d.duplicateTitle}</p>
          <p className="mt-1 text-sm text-ink-700">{duplicate.message}</p>
          <div className="mt-4 flex gap-3">
            <button
              className="btn-primary"
              onClick={async () => {
                await upload(duplicate.file, { forceReplace: true });
                setDuplicate(null);
              }}
            >
              {d.replaceExisting}
            </button>
            <button className="btn-secondary" onClick={() => setDuplicate(null)}>{d.keepExisting}</button>
          </div>
        </div>
      )}

      <section className="mt-8 space-y-3">
        {documents.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-ink-500">{d.empty}</p>}
        {documents.map((doc) => (
          <div key={doc.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="truncate font-semibold text-navy-900">{doc.title}</h3>
                  {stateBadge(doc.state)}
                  <span className="text-xs text-ink-500">
                    {d.versionLabel} {doc.version_no ?? "-"}
                    {doc.has_history ? ` · ${d.historyLabel}` : ""}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-ink-500">
                  {doc.filename} · {((doc.size_bytes ?? 0) / 1024).toFixed(0)} KB
                  {doc.page_count ? ` · ${doc.page_count} ${d.pagesLabel}` : ""}
                  {doc.char_count ? ` · ${doc.char_count.toLocaleString()} ${d.charsLabel}` : ""}
                  {` · ${d.uploadedOn} ${new Date(doc.created_at).toLocaleDateString(locale === "zh-hant" ? "zh-Hant-HK" : "en-HK")}`}
                </p>
                {doc.state === "failed" && doc.error && (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {d.failedReason}: {doc.error}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  {doc.state === "ready" && (
                    <>
                      <button className="btn-ghost !py-1.5 text-xs" onClick={() => setReplaceFor(doc)}>{d.replace}</button>
                      <button className="btn-ghost !py-1.5 text-xs" onClick={() => void download(doc.id)}>{d.download}</button>
                    </>
                  )}
                  {doc.state === "failed" && (
                    <button className="btn-ghost !py-1.5 text-xs" onClick={() => void retry(doc.id)}>{d.retry}</button>
                  )}
                  {doc.state !== "deleting" && (
                    <button className="btn-danger !py-1.5 text-xs" onClick={() => setConfirmDelete(doc)}>{d.delete}</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {replaceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4" role="dialog" aria-modal="true">
          <div className="card w-full max-w-md p-6">
            <h3 className="font-bold text-navy-900">{d.replace}: {replaceFor.title}</h3>
            <p className="mt-2 text-sm text-ink-700">{d.replaceNote}</p>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  void upload(f, { replaceDocumentId: replaceFor.id });
                  setReplaceFor(null);
                }
              }}
              className="mt-4 block w-full text-sm"
            />
            <button className="btn-secondary mt-4 w-full" onClick={() => setReplaceFor(null)}>{t.common.close}</button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4" role="dialog" aria-modal="true">
          <div className="card w-full max-w-md p-6">
            <h3 className="font-bold text-navy-900">{d.deleteConfirmTitle}</h3>
            <p className="mt-2 text-sm text-ink-700">{d.deleteConfirmBody}</p>
            <div className="mt-5 flex gap-3">
              <button className="btn-danger flex-1" onClick={() => void remove(confirmDelete.id)}>{t.common.confirm}</button>
              <button className="btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>{t.common.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
