"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

/** Advances the onboarding step (idempotent server-side set). */
export default function OnboardingAdvance({
  locale,
  step,
  label,
}: {
  locale: Locale;
  step: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-primary mt-4"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/orgs/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "onboarding_step", step }),
        });
        router.refresh();
        setBusy(false);
      }}
    >
      {label}
    </button>
  );
}
