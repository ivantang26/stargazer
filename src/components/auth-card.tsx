import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { isLocale, dict, type Locale } from "@/lib/i18n";

/** Account pages: one focused form panel, centred under the site nav. */
export function AuthCard({
  locale,
  title,
  subtitle,
  children,
}: {
  locale: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  if (!isLocale(locale)) notFound();
  const t = dict(locale as Locale);
  return (
    <div className="ps-container flex justify-center pb-24 pt-12 md:pt-20">
      <div className="w-full max-w-[440px]">
        <h1 className="text-3xl font-semibold tracking-tight text-ps-ink">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ps-muted">{subtitle}</p>
        <div className="ps-panel mt-8 p-6 shadow-[var(--shadow)] md:p-8">{children}</div>
        <Link href={`/${locale}`} className="ps-link mt-6 inline-flex items-center gap-1.5 text-[14px]">
          <ArrowLeft size={14} />
          {t.common.backToHome}
        </Link>
      </div>
    </div>
  );
}
