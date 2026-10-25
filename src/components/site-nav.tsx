import Link from "next/link";
import { List } from "@phosphor-icons/react/dist/ssr";
import { dict, type Locale } from "@/lib/i18n";
import { currentUser } from "@/lib/auth";
import LocaleSwitch from "./locale-switch";
import { StarMark } from "./star-mark";

/** Public navigation: sticky 64px bar, flat links, one primary action. */
export default async function SiteNav({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const user = await currentUser();
  const p = (s: string) => `/${locale}${s}`;
  const links: Array<[string, string]> = [
    [t.nav.product, p("/products/knowledge")],
    [t.nav.solutions, p("/solutions/operations")],
    [t.nav.pricing, p("/pricing")],
    [t.nav.resources, p("/resources")],
    [t.nav.about, p("/about")],
  ];
  const account: [string, string] = user?.emailVerified
    ? [t.app.sidebar.dashboard, "/app"]
    : [t.common.signIn, p("/signin")];

  return (
    <header className="sticky top-0 z-30 border-b border-ps-line bg-ps-bg/85 backdrop-blur supports-[backdrop-filter]:bg-ps-bg/75">
      <div className="ps-container flex h-16 items-center gap-8">
        <Link href={p("/")} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ps-ink">
          <StarMark className="h-6 w-6 text-ps-accent" />
          Stargazer
        </Link>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="ps-link">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden sm:inline">
            <LocaleSwitch locale={locale} />
          </span>
          <Link href={account[1]} className="ps-link hidden sm:inline">
            {account[0]}
          </Link>
          <Link href={p("/demo")} className="ps-action !py-2 !text-[14px]">
            {t.common.tryDemo}
          </Link>
          <details className="group relative lg:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[var(--r-sm)] border border-ps-line text-ps-ink [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <List size={18} weight="bold" />
            </summary>
            <nav
              className="absolute right-0 top-11 w-56 rounded-[var(--r-lg)] border border-ps-line bg-ps-surface p-2 shadow-[var(--shadow)]"
              aria-label="Mobile"
            >
              {[...links, account].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="block rounded-[var(--r-sm)] px-3 py-2 text-[15px] text-ps-ink hover:bg-ps-sunk"
                >
                  {label}
                </Link>
              ))}
              <div className="px-3 py-2">
                <LocaleSwitch locale={locale} />
              </div>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
