import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { activeOrgIdFor, userWorkspaces } from "@/lib/data-access";
import { getDb } from "@/lib/db";
import { dict, type Locale } from "@/lib/i18n";
import { getSetting } from "@/lib/db";
import { formatDate } from "@/lib/util";
import AdminControls from "@/components/admin-controls";

/**
 * Platform administration (PRD §13). Support sees organization status, plan,
 * and processing errors — never prompts or file contents. Content editing and
 * the lead queue share the tab strip.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const user = await currentUser();
  if (!user) redirect("/en/signin");
  if (!user.isStaff) redirect("/app");
  const locale: Locale = user.locale;
  const t = dict(locale);
  const db = getDb();
  const tab = ["leads", "orgs", "content", "flags"].includes(searchParams.tab ?? "")
    ? searchParams.tab!
    : "leads";

  const leads = db
    .prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 50")
    .all() as Array<{
    id: string;
    reference: string;
    name: string;
    email: string;
    org_name: string;
    enquiry_type: string;
    message: string;
    team_size: string | null;
    doc_volume: string | null;
    marketing_consent: number;
    locale: string;
    status: string;
    created_at: string;
  }>;

  const orgs = db
    .prepare(
      `SELECT o.id, o.name, o.deletion_status, s.plan_id, s.status AS sub_status,
        (SELECT COUNT(*) FROM documents WHERE org_id = o.id AND deleted_at IS NULL) AS docs,
        (SELECT COUNT(*) FROM memberships WHERE org_id = o.id) AS members
       FROM organizations o LEFT JOIN subscriptions s ON s.org_id = o.id
       WHERE o.id NOT IN (SELECT org_id FROM memberships WHERE 0) AND o.id != '00000000-demo-0000-0000-000000000001'
       ORDER BY o.created_at DESC LIMIT 50`
    )
    .all() as Array<{
    id: string;
    name: string;
    deletion_status: string | null;
    plan_id: string | null;
    sub_status: string | null;
    docs: number;
    members: number;
  }>;

  const content = db
    .prepare("SELECT id, locale, slug, type, title, status, revision, published_at FROM content_entries ORDER BY locale, slug LIMIT 100")
    .all() as Array<{
    id: string;
    locale: string;
    slug: string;
    type: string;
    title: string;
    status: string;
    revision: number;
    published_at: string | null;
  }>;

  void activeOrgIdFor(user.id);
  void userWorkspaces(user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-navy-900">{t.app.admin.title}</h1>
      <p className="mt-1 text-sm text-ink-500">{t.app.admin.subtitle}</p>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin">
        {(
          [
            ["leads", t.app.admin.tabLeads],
            ["orgs", t.app.admin.tabOrgs],
            ["content", t.app.admin.tabContent],
            ["flags", t.app.admin.tabFlags],
          ] as Array<[string, string]>
        ).map(([id, label]) => (
          <Link
            key={id}
            href={`/app/admin?tab=${id}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? "bg-navy-900 text-white" : "bg-white text-ink-700 border border-line hover:bg-paper"}`}
          >
            {label}
          </Link>
        ))}
        <Link href="/dev/outbox" className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-paper">
          {t.app.admin.tabOutbox} ↗
        </Link>
      </nav>

      {tab === "leads" && (
        <section className="mt-6 space-y-3">
          {leads.length === 0 && <p className="text-sm text-ink-500">{t.app.admin.noRecords}</p>}
          {leads.map((lead) => (
            <div key={lead.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy-900">
                    {lead.reference} · {lead.name}
                    <span className="ml-2 rounded-full bg-navy-900/5 px-2 py-0.5 text-xs font-semibold text-navy-900">{lead.status}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {lead.email} · {lead.org_name || "—"} · {lead.enquiry_type} · {formatDate(lead.created_at, locale)}
                    {lead.team_size ? ` · ${lead.team_size}` : ""}{lead.doc_volume ? ` · ${lead.doc_volume}` : ""}
                  </p>
                </div>
                <AdminControls
                  kind="lead"
                  targetId={lead.id}
                  current={lead.status}
                  options={["new", "assigned", "contacted", "qualified", "closed", "declined"]}
                />
              </div>
              <p className="mt-3 rounded-lg bg-paper px-3.5 py-2.5 text-sm text-ink-700">{lead.message}</p>
              <p className="mt-2 text-xs text-ink-500">{t.app.admin.leadConsent}: {lead.marketing_consent ? "✓" : "—"}</p>
            </div>
          ))}
        </section>
      )}

      {tab === "orgs" && (
        <section className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-ink-500">
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">{t.app.sidebar.workspaceLabel}</th>
                <th className="px-4 py-3 font-semibold">{t.app.admin.orgPlan}</th>
                <th className="px-4 py-3 font-semibold">{t.app.admin.orgStatus}</th>
                <th className="px-4 py-3 font-semibold">{t.app.admin.orgDocs}</th>
                <th className="px-4 py-3 font-semibold">{t.app.admin.orgMembers}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{o.id.slice(0, 12)}…</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{o.name}{o.deletion_status ? ` (${o.deletion_status})` : ""}</td>
                  <td className="px-4 py-3 text-ink-700">{o.plan_id ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-700">{o.sub_status ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-700">{o.docs}</td>
                  <td className="px-4 py-3 text-ink-700">{o.members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "content" && (
        <section className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-ink-500">
                <th className="px-4 py-3 font-semibold">{t.app.admin.contentLocale}</th>
                <th className="px-4 py-3 font-semibold">{t.app.admin.contentType}</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">{t.app.admin.contentStatus}</th>
                <th className="px-4 py-3 font-semibold">r</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {content.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-ink-700">{c.locale}</td>
                  <td className="px-4 py-3 text-ink-700">{c.type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700">{c.slug}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{c.title}</td>
                  <td className="px-4 py-3 text-ink-700">{c.status}</td>
                  <td className="px-4 py-3 text-ink-500">{c.revision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "flags" && (
        <section className="card mt-6 p-6">
          <h2 className="font-bold text-navy-900">{t.app.admin.flagsTitle}</h2>
          <p className="mt-1 text-sm text-ink-700">{t.app.admin.flagsBody}</p>
          <div className="mt-5 space-y-4">
            {(
              [
                ["generation_enabled", t.app.admin.generationEnabled],
                ["demo_enabled", t.app.admin.demoEnabled],
              ] as Array<[string, string]>
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3">
                <span className="text-sm font-medium text-ink-900">{label}</span>
                <AdminControls
                  kind="flag"
                  targetId={key}
                  current={getSetting(key, "true")}
                  options={["true", "false"]}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
