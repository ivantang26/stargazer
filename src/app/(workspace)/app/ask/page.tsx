import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { requireOrgContext, listConversations, listDocuments } from "@/lib/data-access";
import { dict, type Locale } from "@/lib/i18n";
import AskClient from "@/components/ask-client";
import { PLANS } from "@/lib/plans";

export default async function AskPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const guard = await requireOrgContext("member");
  if (!guard.ok) redirect("/app");
  const { ctx } = guard;
  const user = await currentUser();
  if (!user) redirect("/en/signin");
  const locale: Locale = user.locale;
  void dict(locale); // labels come from the client component's dict

  const conversations = listConversations(ctx.orgId, ctx.user.id);
  const documents = listDocuments(ctx.orgId).filter((d) => d.state === "ready");
  const ent = ctx.entitlements;

  return (
    <AskClient
      locale={locale}
      orgName={ctx.orgName}
      conversations={conversations.map((c) => ({ id: c.id, title: c.title, updated_at: c.updated_at }))}
      documents={documents.map((d) => ({ id: d.id, title: d.title }))}
      initialConversationId={searchParams.c ?? null}
      canGenerate={ent.canGenerate}
      readOnly={ent.readOnly}
      planName={locale === "zh-hant" ? PLANS[ent.plan].nameZh : PLANS[ent.plan].nameEn}
      trialActive={ent.status === "trialing"}
      graceActive={ent.status === "past_due"}
      resetDate={ent.resetDate}
      remaining={ent.remaining}
      allowance={ent.allowance}
    />
  );
}
