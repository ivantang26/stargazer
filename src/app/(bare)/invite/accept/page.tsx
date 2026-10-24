"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { dict } from "@/lib/i18n";

function AcceptInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const locale = (params.get("locale") === "zh-hant" ? "zh-hant" : "en") as "en" | "zh-hant";
  const t = dict(locale);
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function accept() {
    setState("busy");
    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      setError(data.error ?? "not_found");
      setState("error");
      return;
    }
    setState("done");
    router.push("/app");
    router.refresh();
  }

  const errorTitle = () => {
    switch (error) {
      case "expired": return t.invite.expiredTitle;
      case "already_accepted": return t.invite.goneTitle;
      case "email_mismatch": return t.invite.mismatchTitle;
      case "seat_limit": return t.invite.seatTitle;
      case "unauthenticated": return t.invite.signinFirst;
      default: return t.invite.goneTitle;
    }
  };
  const errorBody = () => {
    switch (error) {
      case "expired": return t.invite.expiredBody;
      case "already_accepted": return t.invite.goneBody;
      case "email_mismatch": return t.invite.mismatchBody;
      case "seat_limit": return t.invite.seatBody;
      case "unauthenticated": return t.invite.signinFirst;
      default: return t.invite.goneBody;
    }
  };

  return (
    <div className="card w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-navy-900">{t.invite.title}</h1>
      {state === "done" && (
        <>
          <p className="mt-3 font-semibold text-green-700">{t.invite.successTitle}</p>
          <p className="mt-1 text-sm text-ink-700">{t.invite.successBody}</p>
          <Link href="/app" className="btn-primary mt-6 w-full">{t.app.sidebar.dashboard}</Link>
        </>
      )}
      {state === "error" && (
        <>
          <p className="mt-3 font-semibold text-red-700">{errorTitle()}</p>
          <p className="mt-1 text-sm text-ink-700">{errorBody()}</p>
          {error === "unauthenticated" && (
            <Link href={`/${locale}/signin`} className="btn-primary mt-6 w-full">{t.common.signIn}</Link>
          )}
        </>
      )}
      {(state === "idle" || state === "busy") && (
        <>
          <p className="mt-2 text-sm text-ink-700">{t.invite.processing}</p>
          <button onClick={() => void accept()} disabled={state === "busy" || !token} className="btn-primary mt-6 w-full">
            {state === "busy" ? t.common.loading : t.common.confirm}
          </button>
        </>
      )}
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<div className="card w-full max-w-md p-8">…</div>}>
      <AcceptInner />
    </Suspense>
  );
}
