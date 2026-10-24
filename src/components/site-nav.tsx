import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { currentUser } from "@/lib/auth";
import LocaleSwitch from "./locale-switch";
import { StarMark } from "./star-mark";

/**
 * Interior-page navigation: a plain bar on the page ground — wordmark, flat
 * links, one brass action. No bar chrome, no glass.
 */
export default async function SiteNav({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const user = await currentUser();
  const p = (s: string) => `/${locale}${s}`;
  return (
    <header className="site-nav">
      <div className="flex h-20 items-center gap-8 px-5 sm:px-6 lg:px-12">
        <Link href={p("/")} className="nav-wordmark flex items-center gap-2.5 text-[17px] font-semibold tracking-wide text-[var(--ink)]">
          <StarMark className="h-7 w-7 text-[var(--accent)]" />
          <span>Stargazer</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-7 lg:flex" aria-label="Primary">
          <Link href={p("/products/knowledge")} className="ps-link">{t.nav.knowledgeWorkspace}</Link>
          <Link href={p("/solutions/operations")} className="ps-link">{t.nav.solutions}</Link>
          <Link href={p("/pricing")} className="ps-link">{t.nav.pricing}</Link>
          <Link href={p("/resources")} className="ps-link">{t.nav.resources}</Link>
          <Link href={p("/about")} className="ps-link">{t.nav.about}</Link>
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <LocaleSwitch locale={locale} />
          <Link href={user?.emailVerified ? "/app" : p("/signin")} className="ps-link">
            {user ? t.app.sidebar.dashboard : t.common.signIn}
          </Link>
          <Link href={p("/demo")} className="ps-action !px-3.5 !py-2 !text-[15px] sm:!px-[18px] sm:!py-[9px] sm:!text-[16px]">
            {t.common.tryDemo}
          </Link>
        </div>
      </div>
    </header>
  );
}
