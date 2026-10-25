import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import Hero from "@/components/home/hero";
import HowItWorks from "@/components/home/how-it-works";
import FeatureBento from "@/components/home/feature-bento";
import LocalBand from "@/components/home/local-band";
import PricingStrip from "@/components/home/pricing-strip";
import Faq from "@/components/home/faq";
import FinalCta from "@/components/home/final-cta";

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const t = dict(params.locale);
  return {
    title: t.home.metaTitle,
    description: t.home.metaDescription,
    alternates: alternatesFor("/"),
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  return (
    <>
      <Hero locale={locale} />
      <HowItWorks locale={locale} />
      <FeatureBento locale={locale} />
      <LocalBand locale={locale} />
      <PricingStrip locale={locale} />
      <Faq title={t.home.faqTitle} items={t.home.faq} />
      <FinalCta locale={locale} />
    </>
  );
}
