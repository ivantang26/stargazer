import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, dict, type Locale } from "@/lib/i18n";
import { StarMark } from "./star-mark";

/**
 * The account pages as the split stage, form edition: the atlas plate fixed
 * on the left for the length of the screen, the form in the reading column,
 * the brand and the way home together at the foot. The substance stays
 * plain-visible; only the foot rises.
 */
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
    <div className="authsplit">
      <div className="authsplit__stage" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="authsplit__plate"
          src="/assets/hemelkaart-met-christelijke-sterrenbeelden-coelistellati-chr.jpg"
          alt=""
          width={1920}
          height={1624}
          data-drift
        />
      </div>
      <div className="authsplit__form">
        <h1 className="authsplit__title" style={{ fontSize: "clamp(44px, 4vw, 68px)" }}>{title}</h1>
        <p className="authsplit__sub">{subtitle}</p>
        <div style={{ marginTop: 34, width: "100%", maxWidth: 680 }}>
          {children}
        </div>
        <div className="flex items-center gap-6" data-reveal style={{ ["--reveal-delay" as string]: "120ms", marginTop: 32 } as React.CSSProperties}>
          <span className="flex items-center gap-2 text-lg font-semibold text-[var(--ink)]">
            <StarMark className="h-6 w-6 text-[var(--accent)]" />
            Stargazer
          </span>
          <Link href={`/${locale}`} className="ps-link" style={{ fontSize: 16 }}>
            ← {t.common.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
