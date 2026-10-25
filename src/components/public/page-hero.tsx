/**
 * Interior-page header: title, one supporting sentence, optional actions and
 * an optional right-hand element (an image or a real product fragment).
 */
export default function PageHero({
  title,
  sub,
  meta,
  actions,
  aside,
}: {
  title: string;
  sub?: string;
  meta?: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      className={`ps-container grid gap-10 pb-16 pt-12 md:pb-20 md:pt-16 ${aside ? "items-center lg:grid-cols-[1fr_minmax(0,480px)] lg:gap-16" : ""}`}
    >
      <div>
        <h1 className="max-w-[20ch] text-4xl font-semibold leading-[1.1] tracking-tight text-ps-ink md:text-5xl">{title}</h1>
        {sub && <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ps-muted md:text-lg">{sub}</p>}
        {meta && <p className="mt-3 text-[14px] text-ps-muted">{meta}</p>}
        {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {aside && <div>{aside}</div>}
    </section>
  );
}

/** A plain titled section on the interior grid. */
export function Section({
  title,
  children,
  tone = "plain",
  id,
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "plain" | "raised";
  id?: string;
}) {
  return (
    <section id={id} className={tone === "raised" ? "border-y border-ps-line bg-ps-surface" : ""}>
      <div className="ps-container py-16 md:py-20">
        {title && (
          <h2 className="mb-8 max-w-[28ch] text-2xl font-semibold tracking-tight text-ps-ink md:text-3xl" data-reveal>
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}

/** Answer fragment: the question, a cited answer, and its sources. */
export function AnswerCard({
  question,
  answer,
  sources,
}: {
  question?: string;
  answer: React.ReactNode;
  sources: string[];
}) {
  return (
    <div className="ui-frag shadow-[var(--shadow)]">
      {question && <div className="ui-q">{question}</div>}
      <div className="ui-a space-y-3">{answer}</div>
      <div className="mt-4">
        {sources.map((src, i) => (
          <div key={i} className="ui-src">
            <span className="ui-cite !m-0">{i + 1}</span>
            <span>{src}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
