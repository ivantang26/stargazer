import { redirect } from "next/navigation";
import { requireOrgContext } from "@/lib/data-access";
import { currentUser } from "@/lib/auth";
import { dict, type Locale } from "@/lib/i18n";
import { deletionStatus } from "@/lib/org-service";
import SettingsClient from "@/components/settings-client";

export default async function SettingsPage() {
  const guard = await requireOrgContext("member");
  if (!guard.ok) redirect("/app");
  const { ctx } = guard;
  const user = await currentUser();
  const locale: Locale = user?.locale ?? "en";
  void dict(locale);
  const deletion = deletionStatus(ctx.orgId);

  return (
    <SettingsClient
      locale={locale}
      profile={{ name: ctx.user.name, email: ctx.user.email, locale: ctx.user.locale }}
      workspaceName={ctx.orgName}
      isOwner={ctx.role === "owner"}
      deletionStatus={deletion.status}
      deletionProgress={deletion.progress}
    />
  );
}
