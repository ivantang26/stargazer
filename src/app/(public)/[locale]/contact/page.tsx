import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Hash, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { dict, isLocale, alternatesFor, type Locale } from "@/lib/i18n";
import ContactForm from "@/components/contact-form";
import PageHero from "@/components/public/page-hero";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const t = dict(locale as Locale);
  return { title: t.contact.metaTitle, description: t.contact.metaDescription, alternates: alternatesFor("/contact") };
}

/** Contact: what happens after you write on the left, the form on the right. */
export default async function ContactPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const t = dict(locale);
  const zh = locale === "zh-hant";
  const promises = [
    { Icon: Hash, text: zh ? "每項查詢均有參考編號" : "Every enquiry gets a reference number" },
    { Icon: UserCircle, text: zh ? "由指定負責人跟進" : "Routed to a named owner" },
    { Icon: Clock, text: zh ? "一個工作天內回覆（香港辦公時間）" : "Reply within one business day, Hong Kong hours" },
  ];
  return (
    <div>
      <PageHero title={t.contact.title} sub={t.contact.subtitle} />
      <section className="ps-container grid gap-12 pb-24 lg:grid-cols-[4fr_8fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-xl font-semibold tracking-tight text-ps-ink">{t.contact.nextTitle}</h2>
          <ul className="mt-6 space-y-4">
            {promises.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-ps-ink">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-ps-accent-soft text-ps-accent">
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="ps-panel p-6 md:p-8">
          <ContactForm locale={locale} />
        </div>
      </section>
    </div>
  );
}
