import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { activeOrgIdFor, recentActivity, orgNotifications } from "@/lib/data-access";
import { getDb } from "@/lib/db";
import { dict, type Locale } from "@/lib/i18n";
import { entitlementsFor, documentCount, storageUsedBytes } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";
import { deletionStatus } from "@/lib/org-service";
import { formatDate, pct } from "@/lib/util";
import OnboardingAdvance from "@/components/onboarding-advance";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/en/signin");
  const locale: Locale = user.locale;
  const t = dict(locale);
  const d = t.app.dashboard;
  const orgId = activeOrgIdFor(user.id);
  if (!orgId) redirect("/app");

  const db = getDb();
  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(orgId) as {
    name: string;
    onboarding_step: string;
  };
  const deletion = deletionStatus(orgId);
  const ent = entitlementsFor(orgId);
  if (!ent) redirect("/app");
  const { conversations, documents } = recentActivity(orgId, user.id);
  const notifications = orgNotifications(orgId);
  const processing = documents.filter((d) => ["queued", "processing"].includes(d.state)).length;
  const readyDocs = documentCount(orgId);
  const storage = storageUsedBytes(orgId);
  const zh = locale === "zh-hant";

  const steps = ["naming", "visibility", "upload", "processing", "first_question", "done"];
  const stepIndex = steps.indexOf(org.onboarding_step);
  const stepLabels: Record<string, string> = {
    naming: d.stepNaming,
    visibility: d.stepVisibility,
    upload: d.stepUpload,
    processing: d.stepProcessing,
    first_question: d.stepFirstQuestion,
    done: d.stepDone,
  };

  if (deletion.status === "complete") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-navy-900">{t.app.settings.deletionComplete}</h1>
          <p className="mt-3 text-ink-700">{t.footer.entityNote}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">{d.welcome}, {user.name || user.email}</h1>
          <p className="mt-1 text-sm text-ink-500">{d.sampleNote}</p>
        </div>
        <Link href="/app/ask" className="btn-primary">{d.goToAsk}</Link>
      </div>

      {deletion.status && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">{t.app.settings.deletionProgressTitle}</p>
          <p className="mt-1">
            {t.app.settings.subscriptionCanceled}: {deletion.progress.subscription_canceled ?? "pending"} · {t.app.settings.contentDeleted}: {deletion.progress.content_deleted ?? "pending"}
          </p>
        </div>
      )}

      {stepIndex < steps.length - 1 && (
        <section className="card mt-8 p-6">
          <h2 className="text-lg font-bold text-navy-900">{d.onboardingTitle}</h2>
          <p className="text-sm text-ink-500">{d.onboardingSubtitle}</p>
          <ol className="mt-5 space-y-3">
            {steps.slice(0, 5).map((s, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li key={s} className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${current ? "border-accent-500 bg-accent-500/5 font-semibold text-navy-900" : done ? "border-line bg-paper text-ink-500 line-through" : "border-dashed border-line text-ink-500"}`}>
                  <span aria-hidden="true">{done ? "✓" : current ? "→" : "○"}</span>
                  {stepLabels[s]}
                </li>
              );
            })}
          </ol>
          {org.onboarding_step === "naming" && (
            <OnboardingAdvance locale={locale} step="visibility" label={t.common.continue} />
          )}
          {org.onboarding_step === "visibility" && (
            <div className="mt-4">
              <p className="rounded-lg border border-line bg-paper p-4 text-sm text-ink-700">{d.visibilityNote}</p>
              <OnboardingAdvance locale={locale} step="upload" label={d.understand} />
            </div>
          )}
          {org.onboarding_step === "upload" && (
            <Link href="/app/documents" className="btn-primary mt-4">{d.goToDocuments}</Link>
          )}
          {(org.onboarding_step === "processing" || org.onboarding_step === "first_question") && (
            <Link href="/app/ask" className="btn-primary mt-4">{d.goToAsk}</Link>
          )}
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{d.plan}</p>
          <p className="mt-1.5 text-xl font-bold text-navy-900">{zh ? PLANS[ent.plan].nameZh : PLANS[ent.plan].nameEn}</p>
          <p className="mt-0.5 text-xs text-ink-500">{t.app.billing.statuses[ent.status]}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{d.answersUsed}</p>
          <p className="mt-1.5 text-xl font-bold text-navy-900">{ent.used} / {ent.allowance}</p>
          <div className="mt-2 h-1.5 rounded-full bg-line" role="progressbar" aria-valuenow={pct(ent.used, ent.allowance)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-1.5 rounded-full bg-accent-500" style={{ width: `${pct(ent.used, ent.allowance)}%` }} />
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{d.documentsReady}</p>
          <p className="mt-1.5 text-xl font-bold text-navy-900">{readyDocs}{processing > 0 ? <span className="ml-2 text-sm font-medium text-ink-500">+{processing} {t.app.documents.states.processing.toLowerCase()}</span> : null}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{d.storageUsed}</p>
          <p className="mt-1.5 text-xl font-bold text-navy-900">
            {(storage / 1048576).toFixed(1)} MB <span className="text-sm font-medium text-ink-500">/ {ent.limits.storageMb >= 1024 ? `${ent.limits.storageMb / 1024} GB` : `${ent.limits.storageMb} MB`}</span>
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold text-navy-900">{d.recentConversations}</h2>
          {conversations.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">{d.noConversations}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/ask?c=${c.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent-600">
                    <span className="truncate font-medium text-ink-900">{c.title}</span>
                    <span className="shrink-0 text-xs text-ink-500">{formatDate(c.updated_at, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-navy-900">{d.recentDocuments}</h2>
          {documents.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">{d.noDocuments}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate font-medium text-ink-900">{d.title}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${d.state === "ready" ? "bg-green-100 text-green-800" : d.state === "failed" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                    {t.app.documents.states[d.state as keyof typeof t.app.documents.states] ?? d.state}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {notifications.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="font-bold text-navy-900">{d.notifications}</h2>
          <ul className="mt-3 space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="rounded-lg border border-line bg-paper px-4 py-2.5 text-sm text-ink-700">
                {n.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
