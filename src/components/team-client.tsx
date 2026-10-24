"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";

export interface MemberRow {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  verified: boolean;
}
export interface InviteRow {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
}

export default function TeamClient({
  locale,
  members,
  invitations,
  seats,
  seatLimit,
  myRole,
  myUserId,
  ownerId,
}: {
  locale: Locale;
  members: MemberRow[];
  invitations: InviteRow[];
  seats: number;
  seatLimit: number;
  myRole: "owner" | "admin" | "member";
  myUserId: string;
  ownerId: string;
}) {
  const t = dict(locale);
  const tm = t.app.team;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferPw, setTransferPw] = useState("");

  async function call(body: Record<string, unknown>, okText: string) {
    const res = await fetch("/api/team", {
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

  const seatsFull = seats >= seatLimit;
  const isExpired = (iso: string) => new Date(iso).getTime() < Date.now();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-navy-900">{tm.title}</h1>
      <p className="mt-1 text-sm text-ink-500">{tm.subtitle}</p>

      <div className="card mt-8 p-5">
        <p className="text-sm text-ink-700">
          {tm.seatsUsed}: <strong>{seats}</strong> / {seatLimit} ({tm.seatLimit})
        </p>
        <div className="mt-2 h-2 rounded-full bg-line">
          <div className="h-2 rounded-full bg-accent-500" style={{ width: `${Math.min(100, (seats / Math.max(1, seatLimit)) * 100)}%` }} />
        </div>
        {seatsFull && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {tm.seatsFullTitle} — {tm.seatsFullBody}{" "}
            <Link href="/app/billing" className="font-semibold underline">{t.app.ask.upgradeCta}</Link>
          </p>
        )}
      </div>

      {notice && (
        <p className={`mt-4 rounded-lg border px-4 py-3 text-sm ${notice.kind === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`} role="status">
          {notice.text}
        </p>
      )}

      {myRole !== "member" && (
        <section className="card mt-6 p-6">
          <h2 className="font-bold text-navy-900">{tm.inviteTitle}</h2>
          {myRole === "admin" && <p className="mt-1 text-xs text-ink-500">{tm.adminNote}</p>}
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await call({ action: "invite", email, role }, `${email} ✓`);
              if (ok) setEmail("");
            }}
          >
            <div className="min-w-[220px] flex-1">
              <label htmlFor="invite-email" className="label">{tm.inviteEmail}</label>
              <input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="invite-role" className="label">{tm.inviteRole}</label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "member" | "admin")}
                disabled={myRole === "admin"}
                className="input"
              >
                <option value="member">{tm.roleMember}</option>
                <option value="admin" disabled={myRole === "admin"}>{tm.roleAdmin}</option>
              </select>
            </div>
            <button type="submit" disabled={seatsFull} className="btn-primary">{tm.inviteCta}</button>
          </form>
          <p className="mt-3 text-xs text-ink-500">{t.auth.devNote}</p>
        </section>
      )}

      <section className="card mt-6 p-6">
        <h2 className="font-bold text-navy-900">{tm.membersTitle}</h2>
        <ul className="mt-4 divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">
                  {m.name || m.email}{" "}
                  <span className="ml-1 rounded-full bg-navy-900/5 px-2 py-0.5 text-xs font-semibold text-navy-900">
                    {m.role === "owner" ? tm.roleOwner : m.role === "admin" ? tm.roleAdmin : tm.roleMember}
                  </span>
                </p>
                <p className="truncate text-xs text-ink-500">
                  {m.email} · {m.verified ? tm.verified : tm.unverified}
                </p>
              </div>
              {myRole !== "member" && m.id !== myUserId && m.role !== "owner" && (myRole === "owner" || m.role === "member") && (
                <div className="flex gap-2">
                  {myRole === "owner" && (
                    <button
                      className="btn-ghost !py-1.5 text-xs"
                      onClick={() => {
                        const nextRole = m.role === "admin" ? "member" : "admin";
                        void call({ action: "set_role", memberUserId: m.id, role: nextRole }, "✓");
                      }}
                    >
                      {m.role === "admin" ? tm.roleMember : tm.roleAdmin}
                    </button>
                  )}
                  <button
                    className="btn-danger !py-1.5 text-xs"
                    onClick={() => {
                      if (confirm(tm.removeConfirm)) void call({ action: "remove_member", memberUserId: m.id }, "✓");
                    }}
                  >
                    {tm.removeMember}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {invitations.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="font-bold text-navy-900">{tm.invitationsTitle}</h2>
          <ul className="mt-4 divide-y divide-line">
            {invitations.map((inv) => {
              const expired = !inv.accepted_at && isExpired(inv.expires_at);
              return (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink-900">{inv.email}</p>
                    <p className="text-xs text-ink-500">
                      {inv.accepted_at
                        ? `${tm.inviteAccepted} ✓`
                        : expired
                          ? tm.inviteExpired
                          : `${tm.invitePending} ${new Date(inv.expires_at).toLocaleDateString(locale === "zh-hant" ? "zh-Hant-HK" : "en-HK")}`}
                      {" · "}
                      {inv.role === "admin" ? tm.roleAdmin : tm.roleMember}
                    </p>
                  </div>
                  {!inv.accepted_at && !expired && myRole !== "member" && (
                    <button className="btn-ghost !py-1.5 text-xs text-red-600" onClick={() => void call({ action: "revoke_invitation", invitationId: inv.id }, "✓")}>
                      {tm.revokeInvite}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {myRole === "owner" && members.length > 1 && (
        <section className="card mt-6 p-6">
          <h2 className="font-bold text-navy-900">{tm.transfer}</h2>
          <p className="mt-1 text-xs text-ink-500">{tm.transferNote}</p>
          {transferOpen ? (
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="tr-to" className="label">{tm.inviteEmail}</label>
                <select id="tr-to" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="input">
                  <option value="">—</option>
                  {members.filter((m) => m.id !== myUserId && m.verified).map((m) => (
                    <option key={m.id} value={m.id}>{m.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tr-pw" className="label">{t.app.settings.deletePasswordLabel}</label>
                <input id="tr-pw" type="password" value={transferPw} onChange={(e) => setTransferPw(e.target.value)} className="input" autoComplete="current-password" />
              </div>
              <div className="flex gap-3">
                <button
                  className="btn-primary"
                  disabled={!transferTo || !transferPw}
                  onClick={async () => {
                    const ok = await call({ action: "transfer_ownership", toUserId: transferTo, password: transferPw }, "✓");
                    if (ok) {
                      setTransferOpen(false);
                      setTransferPw("");
                    }
                  }}
                >
                  {tm.transferCta}
                </button>
                <button className="btn-secondary" onClick={() => setTransferOpen(false)}>{t.common.cancel}</button>
              </div>
            </div>
          ) : (
            <button className="btn-secondary mt-4" onClick={() => setTransferOpen(true)}>{tm.transferCta}</button>
          )}
        </section>
      )}
      <p className="mt-6 text-xs text-ink-300">owner: {ownerId.slice(0, 8)}</p>
    </div>
  );
}
