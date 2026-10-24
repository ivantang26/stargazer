import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";

/** The homepage close: one quiet line on the ground, credits beneath it. */
export default function QuietFooter({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <footer className="quietfoot">
      <div className="w-full">
        <div className="quietfoot__grid">
          <p className="quietfoot__what">{t.home.footerLine}</p>
          <nav className="quietfoot__links" aria-label="Site">
            <Link href={`/${locale}/products/knowledge`}>{t.nav.knowledgeWorkspace}</Link>
            <Link href={`/${locale}/solutions/operations`}>{t.nav.solutions}</Link>
            <Link href={`/${locale}/demo`}>{t.common.tryDemo}</Link>
            <Link href={`/${locale}/contact`}>{t.nav.contact}</Link>
          </nav>
          <p className="quietfoot__right">
            © 2026 ·{" "}
            <Link href={`/${locale}/terms`} className="text-[var(--ink)] hover:text-[var(--accent)]">
              {t.nav.terms}
            </Link>
          </p>
        </div>
        <p className="quietfoot__credits">{t.home.footerCredits}</p>
      </div>
    </footer>
  );
}
