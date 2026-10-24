import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, htmlLang, type Locale } from "@/lib/i18n";
import SiteNav from "@/components/site-nav";
import SiteFooter from "@/components/site-footer";
import Reveal from "@/components/home/reveal";
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
    <html lang={htmlLang(locale)}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=erode@400,500,600&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="public-site flex min-h-screen flex-col">
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
