import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import { DEMO_LIMITS } from "@/lib/plans";
import DemoClient from "@/components/demo-client";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.demo.metaTitle, description: t.demo.metaDescription, alternates: alternatesFor("/demo") };
}

export default async function DemoPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const jar = cookies();
  const token = jar.get("sg_demo")?.value;
  let remaining = DEMO_LIMITS.questionsPerSession;
  if (token) {
    const { getDb, ensureSeeded } = await import("@/lib/db");
    await ensureSeeded();
    const row = getDb().prepare("SELECT questions_used FROM demo_sessions WHERE token = ?").get(token) as
      | { questions_used: number }
      | undefined;
    if (row) remaining = Math.max(0, DEMO_LIMITS.questionsPerSession - row.questions_used);
  }
  const t = dict(locale);
  return (
    <div style={{ padding: "40px clamp(20px, 3.4vw, 48px) 120px" }}>
      <header className="mb-12" style={{ maxWidth: "52ch" }}>
        <h1 className="ps-h" data-reveal style={{ fontSize: "clamp(44px, 5.2vw, 88px)" }}>{t.demo.title}</h1>
        <p className="ps-statement mt-5" data-reveal style={{ ["--reveal-delay" as string]: "80ms", color: "var(--ink)" } as React.CSSProperties}>
          {t.demo.subtitle}
        </p>
      </header>
      <DemoClient locale={locale} initialRemaining={remaining} />
    </div>
  );
}
