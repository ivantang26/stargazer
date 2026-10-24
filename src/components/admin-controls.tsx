"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Inline status/flag switcher for the staff admin console. */
export default function AdminControls({
  kind,
  targetId,
  current,
  options,
}: {
  kind: "lead" | "flag";
  targetId: string;
  current: string;
  options: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <select
      className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs"
      value={current}
      disabled={busy}
      aria-label={`Set ${kind} status`}
      onChange={async (e) => {
        setBusy(true);
        await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            kind === "lead"
              ? { action: "set_lead_status", leadId: targetId, status: e.target.value }
              : { action: "set_flag", flag: targetId, value: e.target.value }
          ),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
