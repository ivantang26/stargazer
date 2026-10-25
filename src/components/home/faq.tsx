import { Plus } from "@phosphor-icons/react/dist/ssr";

/** Question list as native disclosures: keyboard-accessible, no script. */
export default function Faq({
  title,
  items,
  footnote,
}: {
  title: string;
  items: Array<{ q: string; a: string }>;
  footnote?: string;
}) {
  return (
    <section className="ps-container grid gap-10 py-20 md:py-28 lg:grid-cols-[4fr_8fr] lg:gap-16">
      <h2 className="text-3xl font-semibold tracking-tight text-ps-ink md:text-4xl lg:sticky lg:top-28 lg:self-start" data-reveal>
        {title}
      </h2>
      <div data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
        <div className="divide-y divide-ps-line border-y border-ps-line">
          {items.map((item) => (
            <details key={item.q} className="faq-item group">
              <summary className="flex items-center justify-between gap-6 py-5 text-[16px] font-medium text-ps-ink">
                {item.q}
                <Plus size={16} className="faq-chevron shrink-0 text-ps-muted transition-transform" />
              </summary>
              <p className="-mt-1 max-w-[64ch] pb-5 text-[15px] leading-relaxed text-ps-muted">{item.a}</p>
            </details>
          ))}
        </div>
        {footnote && <p className="mt-6 max-w-[64ch] text-[14px] text-ps-muted">{footnote}</p>}
      </div>
    </section>
  );
}
