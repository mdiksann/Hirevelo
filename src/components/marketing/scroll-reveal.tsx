"use client";

import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sections = document.querySelectorAll<HTMLElement>(
      ".hirevelo-home > .home-hero, .hirevelo-home > section:not(.home-workflow), .home-workflow > div:first-child, .home-workflow > ol > li",
    );
    const animations = new Set<Animation>();
    if (motion.matches || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          if (!entry.isIntersecting) continue;
          element.dataset.reveal = "visible";
          if (!motion.matches) {
            const animation = element.animate(
              [
                { opacity: 0, transform: "translateY(28px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          }
          observer.unobserve(element);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
    );
    for (const section of sections) {
      section.dataset.reveal = "waiting";
      observer.observe(section);
    }
    const stopMotion = () => {
      if (motion.matches) {
        for (const animation of animations) animation.finish();
        observer.disconnect();
        for (const section of sections) section.dataset.reveal = "visible";
      }
    };
    motion.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", stopMotion);
      for (const animation of animations) animation.cancel();
      for (const section of sections) delete section.dataset.reveal;
    };
  }, []);

  return null;
}
