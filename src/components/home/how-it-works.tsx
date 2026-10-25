import { UploadSimple, ChatCircleText, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { dict, type Locale } from "@/lib/i18n";

/** Three steps as one horizontal rail, joined by a single rule. */
export default function HowItWorks({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const icons = [UploadSimple, ChatCircleText, MagnifyingGlass];
  return (
    <section className="border-y border-ps-line bg-ps-surface" id="how">
      <div className="ps-container py-16 md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-ps-ink md:text-3xl" data-reveal>
          {t.home.howTitle}
        </h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0">
          {t.home.howSteps.map((step, i) => {
            const Icon = icons[i];
            return (
              <li
                key={step.title}
                className="relative md:pr-10 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-ps-line md:[&:not(:first-child)]:pl-10"
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-ps-accent-soft text-ps-accent">
                  <Icon size={20} weight="regular" />
                </span>
                <h3 className="mt-5 text-[17px] font-semibold text-ps-ink">{step.title}</h3>
                <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-ps-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
