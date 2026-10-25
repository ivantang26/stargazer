import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Books,
  Translate,
  Quotes,
  WarningCircle,
  LockSimple,
  ChartBar,
  Check,
  Minus,
} from "@phosphor-icons/react/dist/ssr";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import PageHero, { Section, AnswerCard } from "@/components/public/page-hero";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.product.metaTitle, description: t.product.metaDescription, alternates: alternatesFor("/products/knowledge") };
}

/**
 * Product page: a real answer fragment beside the title, inputs and outputs,
 * the six capabilities, getting started, stated limitations, and the role
 * matrix as a real table.
 */
export default async function ProductPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const p = (s: string) => `/${locale}${s}`;
  const icons = [Books, Translate, Quotes, WarningCircle, LockSimple, ChartBar];
  const Y = true;
  const N = false;
  const roleRows: Array<[string, boolean | string, boolean | string, boolean | string]> = [
    [zh ? "提問及閱讀共用文件" : "Ask questions and read shared documents", Y, Y, Y],
    [zh ? "管理自己的對話" : "Manage own conversations", Y, Y, Y],
    [zh ? "上載及維護共用文件" : "Upload and maintain shared documents", Y, Y, N],
    [zh ? "邀請或移除成員" : "Invite or remove members", Y, "*", N],
    [zh ? "指派管理員／轉移擁有權" : "Assign administrators or transfer ownership", Y, N, N],
    [zh ? "查看匯總用量" : "View aggregate usage", Y, Y, zh ? "僅自己" : "Own only"],
    [zh ? "管理帳單／刪除組織" : "Manage billing or delete the organization", Y, N, N],
  ];

  return (
    <div>
      <PageHero
        title={t.product.title}
        sub={t.product.subtitle}
        actions={
          <>
            <Link href={p("/signup")} className="ps-action">{t.common.startTrial}</Link>
            <Link href={p("/demo")} className="ps-secondary">{t.common.tryDemo}</Link>
          </>
        }
        aside={
          <AnswerCard
            question={zh ? "超過五千港元的採購需要誰批准？" : "Who approves a purchase above HKD 5,000?"}
            answer={
              <p>
                {zh
                  ? "超過 5,000 港元的採購須由常務董事書面批准，並透過 Orbit 入口網站提交申請，附上至少兩份報價單。"
                  : "Purchases above HKD 5,000 require written approval from the Managing Director. Submit the request through the Orbit portal with at least two quotations attached."}
                <span className="ui-cite">1</span>
              </p>
            }
            sources={[zh ? "採購申請政策，第 2 節，v1" : "Purchase Request Policy, Section 2, v1"]}
          />
        }
      />

      <Section tone="raised">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div data-reveal>
            <h2 className="text-xl font-semibold tracking-tight text-ps-ink">{t.product.formatsTitle}</h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ps-muted">{t.product.formatsBody}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["PDF", "DOCX", "TXT", "Markdown"].map((f) => (
                <span key={f} className="rounded-[var(--r-sm)] border border-ps-line bg-ps-bg px-2.5 py-1 font-mono text-[12.5px] text-ps-ink">
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
            <h2 className="text-xl font-semibold tracking-tight text-ps-ink">{t.product.outputsTitle}</h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ps-muted">{t.product.outputsBody}</p>
          </div>
        </div>
      </Section>

      <Section title={t.product.featuresTitle}>
        <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {t.product.features.map((f, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div key={f.title} data-reveal style={{ ["--reveal-delay" as string]: `${(i % 3) * 60}ms` }}>
                <Icon size={22} className="text-ps-accent" />
                <h3 className="mt-4 text-[16px] font-semibold text-ps-ink">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ps-muted">{f.body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section tone="raised">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div data-reveal>
            <h2 className="text-2xl font-semibold tracking-tight text-ps-ink md:text-3xl">{t.product.onboardingTitle}</h2>
            <ol className="mt-8 space-y-5">
              {t.product.onboardingSteps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ps-accent-soft font-mono text-[13px] font-semibold text-ps-accent">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-[15px] leading-relaxed text-ps-ink">{s}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-[var(--r-lg)] bg-ps-warn-soft p-6 md:p-8" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
            <h2 className="text-xl font-semibold tracking-tight text-ps-ink">{t.product.limitationsTitle}</h2>
            <ul className="mt-5 space-y-3.5">
              {t.product.limitations.map((l, i) => (
                <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed text-ps-ink">
                  <Minus size={16} className="mt-1 shrink-0 text-ps-warn" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title={t.product.rolesTitle}>
        <p className="-mt-4 mb-8 max-w-[60ch] text-[15px] text-ps-muted">{t.product.rolesNote}</p>
        <div className="overflow-x-auto rounded-[var(--r-lg)] border border-ps-line bg-ps-surface" data-reveal>
          <table className="doctable min-w-[560px]">
            <thead>
              <tr>
                <th style={{ width: "46%" }}>
                  <span className="sr-only">{zh ? "權限" : "Permission"}</span>
                </th>
                <th className="text-center">{t.app.team.roleOwner}</th>
                <th className="text-center">{t.app.team.roleAdmin}</th>
                <th className="text-center">{t.app.team.roleMember}</th>
              </tr>
            </thead>
            <tbody>
              {roleRows.map(([label, ...cells]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {cells.map((c, j) => (
                    <td key={j} className="text-center">
                      {c === true ? (
                        <Check size={16} weight="bold" className="mx-auto text-ps-accent" aria-label={zh ? "是" : "Yes"} />
                      ) : c === false ? (
                        <Minus size={16} className="mx-auto text-ps-muted" aria-label={zh ? "否" : "No"} />
                      ) : c === "*" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Check size={16} weight="bold" className="text-ps-accent" aria-label={zh ? "是" : "Yes"} />*
                        </span>
                      ) : (
                        c
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13.5px] text-ps-muted">* {t.app.team.adminNote}</p>
      </Section>

      <Section>
        <div className="flex flex-col gap-6 rounded-[var(--r-lg)] border border-ps-line bg-ps-surface p-8 md:flex-row md:items-center md:justify-between md:p-10" data-reveal>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ps-ink">{t.product.ctaTitle}</h2>
            <p className="mt-2 max-w-[52ch] text-[15px] text-ps-muted">{t.product.ctaBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={p("/demo")} className="ps-action">{t.common.tryDemo}</Link>
            <Link href={p("/pricing")} className="ps-secondary">{t.nav.pricing}</Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
