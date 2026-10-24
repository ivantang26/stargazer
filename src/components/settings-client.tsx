"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dict, type Locale } from "@/lib/i18n";

export default function SettingsClient({
  locale,
  profile: { name, email, locale: profileLocale },
  workspaceName,
  isOwner,
  deletionStatus,
  deletionProgress,
}: {
  locale: Locale;
  profile: { name: string; email: string; locale: string };
  workspaceName: string;
  isOwner: boolean;
  deletionStatus: string | null;
  deletionProgress: { subscription_canceled?: string; content_deleted?: string };
}) {
  const t = dict(locale);
  const s = t.app.settings;
  const router = useRouter();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [orgName, setOrgName] = useState(workspaceName);

  async function call(url: string, body: Record<string, unknown>, okText: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setNotice({ kind: "err", text: (t.errors as Record<string, string>)[data.error ?? ""] ?? t.errors.bad_request });
      return false;
    }
    setNotice({ kind: "ok", text: okText });
    router.refresh();
    return true;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-navy-900">{s.title}</h1>
      <p className="mt-1 text-sm text-ink-500">{s.subtitle}</p>

      {notice && (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm ${notice.kind === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`} role="status">
          {notice.text}
        </p>
      )}

      <section className="card mt-8 p-6">
        <h2 className="font-bold text-navy-900">{s.profileTitle}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="st-name" className="label">{s.displayName}</label>
            <input id="st-name" defaultValue={name} className="input" />
          </div>
          <div>
            <label htmlFor="st-email" className="label">{t.common.email}</label>
            <input id="st-email" value={email} disabled className="input" />
          </div>
          <div>
            <label htmlFor="st-locale" className="label">{s.interfaceLanguage}</label>
            <select id="st-locale" defaultValue={profileLocale} className="input">
              <option value="en">English</option>
              <option value="zh-hant">繁體中文</option>
            </select>
          </div>
        </div>
        <button
          className="btn-primary mt-4"
          onClick={() => {
            const nameVal = (document.getElementById("st-name") as HTMLInputElement).value;
            const localeVal = (document.getElementById("st-locale") as HTMLSelectElement).value;
            void call("/api/profile", { action: "update_profile", name: nameVal, locale: localeVal }, s.profileSaved);
          }}
        >
          {s.saveProfile}
        </button>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-bold text-navy-900">{s.passwordTitle}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="st-cpw" className="label">{s.currentPassword}</label>
            <input id="st-cpw" type="password" autoComplete="current-password" className="input" />
          </div>
          <div>
            <label htmlFor="st-npw" className="label">{s.newPassword}</label>
            <input id="st-npw" type="password" autoComplete="new-password" className="input" />
          </div>
        </div>
        <button
          className="btn-secondary mt-4"
          onClick={() => {
            const cur = (document.getElementById("st-cpw") as HTMLInputElement).value;
            const next = (document.getElementById("st-npw") as HTMLInputElement).value;
            void call("/api/profile", { action: "change_password", currentPassword: cur, newPassword: next }, s.passwordChanged);
          }}
        >
          {s.changePassword}
        </button>
      </section>

      {isOwner && (
        <section className="card mt-6 p-6">
          <h2 className="font-bold text-navy-900">{s.workspaceTitle}</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label htmlFor="st-org" className="label">{s.workspaceName}</label>
              <input id="st-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input" maxLength={120} />
            </div>
            <button
              className="btn-secondary"
              onClick={() => void call("/api/orgs/settings", { action: "rename", name: orgName }, "✓")}
            >
              {s.renameWorkspace}
            </button>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-bold text-red-700">{s.deleteTitle}</h3>
            <p className="mt-1 text-xs text-ink-700">{s.deleteBody}</p>
            {deletionStatus === "complete" ? (
              <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{s.deletionComplete}</p>
            ) : deletionStatus ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-amber-800">{s.deletionProgressTitle}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${deletionProgress.subscription_canceled === "done" ? "bg-green-500" : "bg-amber-400"}`} />
                  {s.subscriptionCanceled}: {deletionProgress.subscription_canceled ?? "pending"}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${deletionProgress.content_deleted === "done" ? "bg-green-500" : "bg-amber-400"}`} />
                  {s.contentDeleted}: {deletionProgress.content_deleted ?? "pending"}
                </div>
              </div>
            ) : (
              <>
                <button className="btn-danger mt-3" onClick={() => setDeleteOpen(true)}>{s.deleteCta}</button>
                {deleteOpen && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4">
                    <p className="font-semibold text-red-800">{s.deleteConfirmTitle}</p>
                    <p className="mt-1 text-sm text-ink-700">{s.deleteConfirmBody}</p>
                    <div className="mt-3 max-w-xs">
                      <label htmlFor="del-pw" className="label">{s.deletePasswordLabel}</label>
                      <input id="del-pw" type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} className="input" autoComplete="current-password" />
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        className="btn-danger"
                        disabled={!deletePw}
                        onClick={async () => {
                          const ok = await call("/api/orgs/settings", { action: "delete", password: deletePw }, s.deletionProgressTitle);
                          if (ok) {
                            setDeleteOpen(false);
                            setDeletePw("");
                          }
                        }}
                      >
                        {t.common.confirm}
                      </button>
                      <button className="btn-secondary" onClick={() => setDeleteOpen(false)}>{t.common.cancel}</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <section className="card mt-6 p-6">
        <h2 className="font-bold text-navy-900">{s.exportTitle}</h2>
        <p className="mt-1 text-sm text-ink-700">{s.exportBody}</p>
        <a href="/api/orgs/export" className="btn-secondary mt-4">{s.exportCta}</a>
      </section>
    </div>
  );
}
