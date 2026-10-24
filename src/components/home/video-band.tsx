import { dict, type Locale } from "@/lib/i18n";

/**
 * The one moving picture: eleven seconds of the stars turning about the
 * celestial pole, as a muted loop with its poster frame.
 */
export default function VideoBand({ locale }: { locale: Locale }) {
  const t = dict(locale);
  return (
    <figure className="videoband" data-reveal>
      <video
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        poster="/assets/starry-sky-with-north-star-circled-poster.jpg"
      >
        <source src="/assets/starry-sky-with-north-star-circled.webm" type="video/webm" />
      </video>
      <figcaption>{t.home.videoCaption}</figcaption>
    </figure>
  );
}
