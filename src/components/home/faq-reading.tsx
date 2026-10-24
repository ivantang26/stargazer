import { dict, type Locale } from "@/lib/i18n";

/**
 * The questions and answers as continuous reading text, like the notes at the
 * back of a programme: the question runs in as the opening phrase, the answer
 * carries on in the same paragraph. No toggles, nothing hidden.
 */
export default function FaqReading({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <section className="faqread">
      <h2 className="ps-h" data-reveal>
        {t.home.faqTitle}
      </h2>
      <div className="faqread__text" data-reveal style={{ ["--reveal-delay" as string]: "80ms" }}>
        {t.home.faq.map((item, i) => (
          <p key={i}>
            <b>{item.q}</b> {item.a}
          </p>
        ))}
      </div>
    </section>
  );
}
