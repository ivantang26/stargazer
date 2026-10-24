import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { StarMark } from "./star-mark";

/** Interior-page close: dark ground, the name returning large, quiet link rows. */
export default function SiteFooter({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const p = (s: string) => `/${locale}${s}`;
  const groups: Array<{ title: string; links: Array<[string, string]> }> = [
    {
      title: t.footer.product,
      links: [
        [t.nav.knowledgeWorkspace, p("/products/knowledge")],
        [t.nav.pricing, p("/pricing")],
        [t.common.tryDemo, p("/demo")],
      ],
    },
    {
      title: t.footer.solutions,
      links: [
        [t.nav.operations, p("/solutions/operations")],
        [t.nav.supportPrep, p("/solutions/support")],
      ],
    },
    {
      title: t.footer.resources,
      links: [
        [t.nav.resources, p("/resources")],
        [t.nav.contact, p("/contact")],
      ],
    },
    {
      title: t.footer.legal,
      links: [
        [t.nav.security, p("/security")],
        [t.nav.privacy, p("/privacy")],
        [t.nav.terms, p("/terms")],
      ],
    },
  ];
  return (
    <footer className="site-footer">
      <div className="mx-auto max-w-content px-4 pb-14 pt-20 sm:px-8">
        <p
          className="select-none text-[clamp(64px,9vw,150px)] font-normal leading-[0.9] tracking-[-0.04em] text-[var(--ink)]" data-reveal
          aria-hidden="true"
        >
          stargazer
        </p>
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div data-reveal>
            <div className="flex items-center gap-2.5">
              <StarMark className="h-7 w-7 text-[var(--accent)]" />
              <span className="text-lg font-semibold text-[var(--ink)]">Stargazer</span>
            </div>
            <p className="mt-3 max-w-sm text-[16px] leading-relaxed text-[var(--muted)]">{t.footer.tagline}</p>
          </div>
          {groups.map((g, i0) => (
            <nav key={g.title} aria-label={g.title} data-reveal style={{ ["--reveal-delay" as string]: `${i0 * 60}ms` } as React.CSSProperties}>
              <h3 className="text-[16px] font-semibold text-[var(--ink)]">{g.title}</h3>
              <ul className="mt-3 space-y-2">
                {g.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-[16px] text-[var(--muted)] transition hover:text-[var(--ink)]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex max-w-[82ch] flex-col gap-2 text-[16px] text-[var(--muted)]" data-reveal>
          <p>© 2026 Stargazer. {t.footer.rights}</p>
          <p>{t.footer.entityNote}</p>
          <p>{t.footer.statusLine}</p>
          <p>{t.home.footerCredits}</p>
        </div>
      </div>
    </footer>
  );
}
