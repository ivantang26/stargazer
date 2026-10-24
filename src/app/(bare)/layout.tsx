import "@/app/globals.css";

/** Minimal root layout for standalone flows (invitation acceptance, dev tools). */
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink-900 antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">{children}</div>
      </body>
    </html>
  );
}
