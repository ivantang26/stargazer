/**
 * Long-form document: a sticky table of contents on wide screens, the
 * sections in one readable measure beside it.
 */
export default function DocLayout({
  tocTitle,
  sections,
  intro,
}: {
  tocTitle: string;
  sections: Array<{ title: string; body: string }>;
  intro?: React.ReactNode;
}) {
  const slug = (i: number) => `s-${i + 1}`;
  return (
    <section className="ps-container grid gap-10 pb-24 lg:grid-cols-[3fr_9fr] lg:gap-16">
      <nav className="hidden lg:sticky lg:top-28 lg:block lg:self-start" aria-label={tocTitle}>
        <p className="text-[13px] font-semibold text-ps-ink">{tocTitle}</p>
        <ol className="mt-3 space-y-2 border-l border-ps-line">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a href={`#${slug(i)}`} className="-ml-px block border-l border-transparent pl-4 text-[14px] text-ps-muted transition hover:border-ps-accent hover:text-ps-ink">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="doc-body">
        {intro}
        {sections.map((s, i) => (
          <div key={s.title} id={slug(i)} className="scroll-mt-24">
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
