import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import HeroSplit from "@/components/home/hero-split";
import HowItWorks from "@/components/home/how-it-works";
import LiveAsk from "@/components/home/live-ask";
import VideoBand from "@/components/home/video-band";
import PricingMenu from "@/components/home/pricing-menu";
import FaqReading from "@/components/home/faq-reading";
import CtaGold from "@/components/home/cta-gold";
import QuietFooter from "@/components/home/quiet-footer";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const t = dict(params.locale);
  return {
    title: t.home.metaTitle,
    description: t.home.metaDescription,
    alternates: alternatesFor("/"),
  };
}

/**
 * The homepage as the split stage:
 * the engraved atlas fixed on the dark field, the reading column scrolling
 * beside it; then the pinned product fragment, the live question and its
 * answer, the stars turning, the menu of prices, the questions as reading
 * text, and the first screen of the product already open on brass.
 */
export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  void dict(locale);
  return (
    <div id="home-root">
      <HeroSplit locale={locale} />
      <HowItWorks locale={locale} />
      <LiveAsk locale={locale} />
      <VideoBand locale={locale} />
      <PricingMenu locale={locale} />
      <FaqReading locale={locale} />
      <CtaGold locale={locale} />
      <QuietFooter locale={locale} />
    </div>
  );
}
