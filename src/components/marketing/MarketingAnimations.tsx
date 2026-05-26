"use client";

import { useEffect } from "react";

/**
 * Drop this once anywhere inside a marketing page layout.
 * It wires up an IntersectionObserver that adds `.mkt-visible` to any
 * element carrying `.mkt-reveal`, triggering the CSS fade-up transition.
 */
export default function MarketingAnimations() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".mkt-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("mkt-visible");
            observer.unobserve(entry.target); // fire once
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
