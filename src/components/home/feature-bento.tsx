import { FileText, WarningCircle, ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr";
import { dict, type Locale } from "@/lib/i18n";

/**
 * Four capabilities, each shown with a small piece of the real interface:
 * an opened citation, the same question in both languages, an honest
 * "not in the documents" reply, and the versioned library.
 */
export default function FeatureBento({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const h = t.home;
  return (
    <section className="ps-container py-20 md:py-28">
      <h2 className="max-w-[24ch] text-3xl font-semibold tracking-tight text-ps-ink md:text-4xl" data-reveal>
        {h.featuresTitle}
      </h2>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {/* Citation, opened */}
        <article className="ps-panel flex flex-col p-6 md:p-8 lg:col-span-2" data-reveal>
          <Heading title={h.featCite.title} body={h.featCite.body} />
          <div className="mt-8 rounded-[var(--r-lg)] bg-ps-sunk p-4 md:p-5">
            <p className="text-[15px] leading-relaxed text-ps-ink">
              {zh
                ? "超過 5,000 港元的採購須由常務董事書面批准"
                : "Purchases above HKD 5,000 require written approval from the Managing Director"}
              <span className="ui-cite">1</span>
              {zh ? "，並須附至少兩份報價單" : ", with at least two quotations attached"}
              <span className="ui-cite">2</span>
              {zh ? "。" : "."}
            </p>
            <div className="mt-4 rounded-[var(--r-sm)] border border-ps-line bg-ps-surface p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-ps-ink">
                <span className="ui-cite !m-0">1</span>
                <FileText size={15} className="text-ps-muted" />
                {zh ? "採購申請政策，第 2 節" : "Purchase Request Policy, Section 2"}
                <span className="font-mono text-[12px] text-ps-muted">v3</span>
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ps-muted">
                {zh ? "任何超過 5,000 港元的採購及所有經常性供應商合約，均須" : "Any purchase above HKD 5,000, and all recurring vendor contracts, "}
                <mark className="rounded-[3px] bg-ps-accent-soft px-0.5 text-ps-ink">
                  {zh ? "常務董事書面批准" : "require written approval from the Managing Director"}
                </mark>
                {zh ? "。" : "."}
              </p>
            </div>
          </div>
        </article>

        {/* Bilingual */}
        <article className="flex flex-col rounded-[var(--r-lg)] bg-ps-accent-soft p-6 md:p-8" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
          <Heading title={h.featBilingual.title} body={h.featBilingual.body} />
          <div className="mt-auto space-y-2 pt-8">
            <p className="rounded-[var(--r-sm)] bg-ps-surface px-3.5 py-2.5 text-[14px] text-ps-ink" lang="en">
              Who approves a purchase above HKD 5,000?
            </p>
            <p className="flex justify-center text-ps-accent" aria-hidden="true">
              <ArrowsLeftRight size={18} className="rotate-90" />
            </p>
            <p className="rounded-[var(--r-sm)] bg-ps-surface px-3.5 py-2.5 text-[14px] text-ps-ink" lang="zh-Hant">
              購買超過五千港元的物品需要誰批准？
            </p>
          </div>
        </article>

        {/* Honest when evidence is missing */}
        <article className="flex flex-col rounded-[var(--r-lg)] bg-ps-warn-soft p-6 md:p-8" data-reveal>
          <Heading title={h.featHonest.title} body={h.featHonest.body} />
          <div className="mt-auto pt-8">
            <p className="text-[13.5px] text-ps-muted">{h.featHonestSampleQ}</p>
            <div className="mt-2 rounded-[var(--r-sm)] bg-ps-surface p-3.5">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-ps-warn">
                <WarningCircle size={15} />
                {t.demo.insufficientTitle}
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ps-ink">{h.featHonestSampleA}</p>
            </div>
          </div>
        </article>

        {/* Versioned library */}
        <article className="ps-panel flex flex-col p-6 md:p-8 lg:col-span-2" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
          <Heading title={h.featVersions.title} body={h.featVersions.body} />
          <div className="mt-8">
            <div className="ui-row">
              <span>{zh ? "採購申請政策" : "Purchase Request Policy"}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-ps-muted">v3</span>
                <span className="ui-tag ui-tag--ok">{zh ? "就緒" : "Ready"}</span>
              </span>
            </div>
            <div className="ui-row">
              <span>{zh ? "開支報銷政策" : "Expense Reimbursement Policy"}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-ps-muted">v2</span>
                <span className="ui-tag">{zh ? "處理中" : "Processing"}</span>
              </span>
            </div>
            <div className="ui-row">
              <span lang="zh-Hant">客戶退款政策</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-ps-muted">v1</span>
                <span className="ui-tag ui-tag--ok">{zh ? "就緒" : "Ready"}</span>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-[19px] font-semibold tracking-tight text-ps-ink">{title}</h3>
      <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-ps-muted">{body}</p>
    </div>
  );
}
