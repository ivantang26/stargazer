"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StarMark } from "./star-mark";

export interface SidebarLabels {
  dashboard: string;
  ask: string;
  documents: string;
  team: string;
  usage: string;
  billing: string;
  settings: string;
  admin: string;
  backToSite: string;
  signOut: string;
  workspaceLabel: string;
  role: string;
}

export default function AppSidebar({
  labels,
  orgName,
  isStaff,
}: {
  labels: SidebarLabels;
  orgName: string;
  isStaff: boolean;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const links: Array<[string, string]> = [
    ["/app", labels.dashboard],
    ["/app/ask", labels.ask],
    ["/app/documents", labels.documents],
    ["/app/team", labels.team],
    ["/app/usage", labels.usage],
    ["/app/billing", labels.billing],
    ["/app/settings", labels.settings],
  ];
  if (isStaff) links.push(["/app/admin", labels.admin]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/en");
    router.refresh();
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 py-4 lg:block">
        <Link href="/app" className="flex items-center gap-2 font-semibold text-navy-900">
          <StarMark className="h-6 w-6 text-accent-500" />
          <span>Stargazer</span>
        </Link>
        <div className="lg:mt-4 lg:rounded-xl lg:bg-paper lg:p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{labels.workspaceLabel}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-navy-900" title={orgName}>{orgName}</p>
          <p className="text-xs text-ink-500">{labels.role}</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Workspace">
        {links.map(([href, label]) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                active ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-paper hover:text-navy-900"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden px-3 pb-4 lg:block">
        <Link href="/en" className="block rounded-lg px-3.5 py-2 text-sm text-ink-500 transition hover:bg-paper hover:text-navy-900">
          ← {labels.backToSite}
        </Link>
        <button onClick={() => void signOut()} className="mt-1 block w-full rounded-lg px-3.5 py-2 text-left text-sm text-ink-500 transition hover:bg-paper hover:text-navy-900">
          {labels.signOut}
        </button>
      </div>
    </aside>
  );
}
