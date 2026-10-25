import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { StarMark } from "./star-mark";

/** Public footer: brand line, four link groups, legal notes. */
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
      title: t.footer.company,
      links: [
        [t.nav.about, p("/about")],
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
    <footer className="border-t border-ps-line">
      <div className="ps-container py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Link href={p("/")} className="flex items-center gap-2 text-[15px] font-semibold text-ps-ink">
              <StarMark className="h-6 w-6 text-ps-accent" />
              Stargazer
            </Link>
            <p className="mt-3 max-w-[32ch] text-[14px] leading-relaxed text-ps-muted">{t.footer.tagline}</p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h3 className="text-[13px] font-semibold text-ps-ink">{g.title}</h3>
              <ul className="mt-3 space-y-2">
                {g.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-[14px] text-ps-muted transition hover:text-ps-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 space-y-1.5 border-t border-ps-line pt-6 text-[13px] leading-relaxed text-ps-muted">
          <p>© 2026 Stargazer. {t.footer.rights}</p>
          <p>{t.footer.statusLine}</p>
          <p>{t.footer.entityNote}</p>
          <p>{t.footer.photoCredit}</p>
        </div>
      </div>
    </footer>
  );
}
