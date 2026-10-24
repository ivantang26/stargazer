import { redirect } from "next/navigation";
import { requireOrgContext, listMembers, listInvitations } from "@/lib/data-access";
import { currentUser } from "@/lib/auth";
import { dict, type Locale } from "@/lib/i18n";
import { seatsInUse } from "@/lib/entitlements";
import { getDb } from "@/lib/db";
import TeamClient from "@/components/team-client";

export default async function TeamPage() {
  const guard = await requireOrgContext("member");
  if (!guard.ok) redirect("/app");
  const { ctx } = guard;
  const user = await currentUser();
  const locale: Locale = user?.locale ?? "en";
  void dict(locale);

  const members = listMembers(ctx.orgId).map((m) => ({
    id: m.id,
    email: m.email,
    name: m.name,
    role: m.role,
    verified: !!m.email_verified_at,
  }));
  const invitations = listInvitations(ctx.orgId).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    expires_at: i.expires_at,
    accepted_at: i.accepted_at,
  }));
  const { seats, limit } = seatsInUse(ctx.orgId);
  const org = getDb().prepare("SELECT owner_user_id FROM organizations WHERE id = ?").get(ctx.orgId) as { owner_user_id: string };

  return (
    <TeamClient
      locale={locale}
      members={members}
      invitations={invitations}
      seats={seats}
      seatLimit={limit}
      myRole={ctx.role}
      myUserId={ctx.user.id}
      ownerId={org.owner_user_id}
    />
  );
}
