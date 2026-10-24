"use client";

import { useEffect, useRef } from "react";

/**
 * The signature move: the giant lowercase name scales down a few percent as
 * the first screen leaves (scroll-linked, transform only, under 8% travel).
 * Without scroll support or with reduced motion, it simply rests at scale 1.
 */
export default function Wordmark({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        const total = Math.max(1, rect.height + 64);
        const gone = Math.min(1, Math.max(0, -rect.top / total));
        el.style.setProperty("--wm", gone.toFixed(3));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <h1 className="wordmark" ref={ref}>
      {children}
    </h1>
  );
}
