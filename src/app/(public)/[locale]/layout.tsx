import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, htmlLang, type Locale } from "@/lib/i18n";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import Reveal from "@/components/home/reveal";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/app/globals.css";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh-hant" }];
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  return { title: "Stargazer", description: "Answers from your business documents, with sources." };
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  return (
    <html lang={htmlLang(locale)} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="public-site flex min-h-[100dvh] flex-col">
        <SiteNav locale={locale} />
        <main className="flex-1">
          <Reveal />
          {children}
        </main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
