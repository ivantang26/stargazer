import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { dict, type Locale } from "@/lib/i18n";
import CitedText from "@/components/cited-text";
import PageHero, { Section, AnswerCard } from "./page-hero";

interface WorkflowCopy {
  title: string;
  subtitle: string;
  scenarioLabel: string;
  scenario: string;
  question: string;
  answerLabel: string;
  answer: string[];
  source1: string;
  source2: string;
  reviewTitle: string;
  reviewBody: string;
  cta: string;
}

/**
 * A solution page: the scenario and the employee's question on the left,
 * the cited answer as the product renders it on the right, then what a
 * person still has to check.
 */
export default function WorkflowPage({ locale, s }: { locale: Locale; s: WorkflowCopy }) {
  const t = dict(locale);
  const p = (x: string) => `/${locale}${x}`;
  return (
    <div>
      <PageHero
        title={s.title}
        sub={s.subtitle}
        actions={
          <>
            <Link href={p("/demo")} className="ps-action">{t.common.tryDemo}</Link>
            <Link href={p("/signup")} className="ps-secondary">{t.common.startTrial}</Link>
          </>
        }
      />

      <Section tone="raised">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div data-reveal>
            <p className="text-[14px] font-medium text-ps-muted">{s.scenarioLabel}</p>
            <p className="mt-3 max-w-[48ch] text-[16px] leading-relaxed text-ps-ink">{s.scenario}</p>
            <p className="mt-8 rounded-[var(--r-lg)] border border-ps-line bg-ps-bg p-5 text-xl font-medium leading-snug tracking-tight text-ps-ink">
              {s.question}
            </p>
          </div>
          <div data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
            <p className="mb-3 text-[14px] font-medium text-ps-muted">{s.answerLabel}</p>
            <AnswerCard
              answer={s.answer.map((a, i) => (
                <p key={i}>
                  <CitedText text={a} />
                </p>
              ))}
              sources={[s.source1, s.source2]}
            />
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex max-w-3xl gap-4" data-reveal>
          <CheckCircle size={26} className="mt-1 shrink-0 text-ps-accent" />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ps-ink md:text-3xl">{s.reviewTitle}</h2>
            <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ps-muted">{s.reviewBody}</p>
            <Link href={p("/demo")} className="ps-action mt-8">{s.cta}</Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
