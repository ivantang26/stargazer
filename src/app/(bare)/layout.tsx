import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/app/globals.css";

/** Minimal root layout for standalone flows (invitation acceptance, dev tools). */
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-paper text-ink-900 antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">{children}</div>
      </body>
    </html>
  );
}
