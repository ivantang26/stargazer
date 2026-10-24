"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelResumeButtons({
  cancelling,
  labels,
}: {
  cancelling: boolean;
  labels: { cancel: string; resume: string; busy: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={cancelling ? "btn-secondary" : "btn-danger"}
      disabled={busy}
      onClick={async () => {
        if (!confirm(cancelling ? labels.resume + "?" : labels.cancel + "?")) return;
        setBusy(true);
        await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: cancelling ? "resume" : "cancel_at_period_end" }),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      {busy ? labels.busy : cancelling ? labels.resume : labels.cancel}
    </button>
  );
}
