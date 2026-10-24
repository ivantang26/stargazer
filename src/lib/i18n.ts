import { en, type Dict } from "./i18n/en";
import { zhHant } from "./i18n/zh-hant";

export const LOCALES = ["en", "zh-hant"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const DICTS: Record<Locale, Dict> = { en, "zh-hant": zhHant };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dict(locale: string): Dict {
  return isLocale(locale) ? DICTS[locale] : DICTS[DEFAULT_LOCALE];
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "zh-hant" : "en";
}

/** Swap the locale segment while preserving the rest of the path. */
export function localePath(target: Locale, rest: string): string {
  const suffix = rest === "/" ? "" : rest;
  return `/${target}${suffix}`;
}

export function htmlLang(locale: Locale): string {
  return locale === "zh-hant" ? "zh-Hant" : "en";
}

/** Alternates + self canonical for hreflang (PRD §19). */
export function alternatesFor(rest: string): { languages: Record<string, string>; canonical: string } {
  const suffix = rest === "/" ? "" : rest;
  return {
    languages: { en: `/en${suffix}`, "zh-Hant": `/zh-hant${suffix}` },
    canonical: `/en${suffix}`,
  };
}
