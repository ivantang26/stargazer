import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { activeOrgIdFor } from "@/lib/data-access";
import { getDb } from "@/lib/db";
import { dict, htmlLang, type Locale } from "@/lib/i18n";
import AppSidebar from "@/components/app-sidebar";
import CreateWorkspace from "@/components/create-workspace";
import type { Role } from "@/lib/db";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Workspace - Stargazer",
  robots: { index: false, follow: false },
};

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/en/signin");
  if (!user.emailVerified) redirect(`/${user.locale}/verify`);
  const locale: Locale = user.locale;
  const t = dict(locale);

  const orgId = activeOrgIdFor(user.id);
  if (!orgId) {
    return (
      <html lang={htmlLang(locale)} className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="min-h-screen bg-paper">
          <CreateWorkspace locale={locale} userName={user.name} />
        </body>
      </html>
    );
  }

  const org = getDb()
    .prepare("SELECT name, deletion_status FROM organizations WHERE id = ?")
    .get(orgId) as { name: string; deletion_status: string | null };
  const membership = getDb()
    .prepare("SELECT role FROM memberships WHERE org_id = ? AND user_id = ?")
    .get(orgId, user.id) as { role: Role } | undefined;

  const roleLabel =
    membership?.role === "owner" ? t.app.team.roleOwner
    : membership?.role === "admin" ? t.app.team.roleAdmin
    : t.app.team.roleMember;

  return (
    <html lang={htmlLang(locale)} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="app-site min-h-screen bg-paper">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AppSidebar
            labels={{
              dashboard: t.app.sidebar.dashboard,
              ask: t.app.sidebar.ask,
              documents: t.app.sidebar.documents,
              team: t.app.sidebar.team,
              usage: t.app.sidebar.usage,
              billing: t.app.sidebar.billing,
              settings: t.app.sidebar.settings,
              admin: t.app.sidebar.admin,
              backToSite: t.app.sidebar.backToSite,
              signOut: t.common.signOut,
              workspaceLabel: t.app.sidebar.workspaceLabel,
              role: roleLabel,
            }}
            orgName={org?.name ?? "-"}
            isStaff={user.isStaff}
          />
          <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
        </div>
      </body>
    </html>
  );
}
