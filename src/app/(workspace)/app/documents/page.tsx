import { redirect } from "next/navigation";
import { requireOrgContext, listDocuments } from "@/lib/data-access";
import { currentUser } from "@/lib/auth";
import { dict, type Locale } from "@/lib/i18n";
import { storageUsedBytes } from "@/lib/entitlements";
import DocumentsClient from "@/components/documents-client";

export default async function DocumentsPage() {
  const guard = await requireOrgContext("member");
  if (!guard.ok) redirect("/app");
  const { ctx } = guard;
  const user = await currentUser();
  const locale: Locale = user?.locale ?? "en";
  void dict(locale);

  const documents = listDocuments(ctx.orgId).map((d) => ({
    id: d.id,
    title: d.title,
    filename: d.filename,
    ext: d.ext,
    state: d.state,
    error: d.error,
    created_at: d.created_at,
    version_no: d.version_no,
    char_count: d.char_count,
    page_count: d.page_count,
    size_bytes: d.size_bytes,
    has_history: d.has_history,
  }));

  return (
    <DocumentsClient
      locale={locale}
      documents={documents}
      canUpload={ctx.entitlements.canUpload}
      storageUsedMb={storageUsedBytes(ctx.orgId) / 1048576}
      storageLimitMb={ctx.entitlements.limits.storageMb}
      docCount={documents.filter((d) => d.state !== "deleting").length}
      docLimit={ctx.entitlements.limits.documents}
      isAdmin={ctx.role !== "member"}
    />
  );
}
