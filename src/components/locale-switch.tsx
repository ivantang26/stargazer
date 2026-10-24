"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dict, otherLocale, type Locale } from "@/lib/i18n";

/** Switch language while preserving the equivalent page (PRD §6). */
export default function LocaleSwitch({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const other = otherLocale(locale);
  const pathname = usePathname() ?? `/${locale}`;
  const rest = pathname.replace(/^\/(en|zh-hant)/, "") || "/";
  const suffix = rest === "/" ? "" : rest;
  return (
    <Link
      href={`/${other}${suffix}`}
      lang={other}
      className="text-[14px] font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]"
      aria-label={`${t.common.languageSwitchLabel}: ${t.common.otherLocaleName}`}
    >
      {t.common.otherLocaleName}
    </Link>
  );
}
