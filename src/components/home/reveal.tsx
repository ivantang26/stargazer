"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Entrance motion for below-the-fold content: elements marked data-reveal
 * rise 12px and fade in once when they enter the viewport. Re-binds on
 * client navigation. The hidden starting state is gated behind
 * prefers-reduced-motion: no-preference in CSS.
 */
export default function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
