import Link from "next/link";
import { dict, otherLocale, type Locale } from "@/lib/i18n";
import Wordmark from "./wordmark";

/**
 * The split stage, hero: the engraved celestial atlas fixed on the dark
 * field for the length of the first screens (the object-on-field variant of
 * the blueprint — the square plate is never cropped), the reading column
 * beside it, and the name returning at the bottom.
 */
export default function HeroSplit({ locale }: { locale: Locale }) {
  const t = dict(locale);
  const other = otherLocale(locale);
  return (
    <section className="split-hero" aria-label={t.home.badge}>
      <div className="split-hero__stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="split-hero__plate"
          src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
          alt="Engraved celestial chart of the constellations, Cellarius, 1660"
          width={1920}
          height={1624}
        />
      </div>
      <div className="split-hero__scroll">
        <nav className="split-hero__links" aria-label="Site">
          <Link href={`/${locale}/pricing`} className="ps-link">{t.nav.pricing}</Link>
          <Link href={`/${locale}/products/knowledge`} className="ps-link">{t.nav.product}</Link>
          <Link href={`/${other}`} lang={other} className="ps-link">{t.common.otherLocaleName}</Link>
          <Link href={`/${locale}/signin`} className="ps-link">{t.common.signIn}</Link>
          <Link href={`/${locale}/demo`} className="ps-action">{t.common.tryDemo}</Link>
        </nav>
        <p className="split-hero__sentence" data-reveal>
          {t.common.brandLine}
        </p>
        <div className="mt-auto pb-10">
          <Wordmark>stargazer</Wordmark>
        </div>
      </div>
    </section>
  );
}
