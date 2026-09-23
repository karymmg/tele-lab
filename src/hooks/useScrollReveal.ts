import { useEffect } from "react";

/** Replay reveal motion whenever an item enters the viewport in either direction. */
export function useScrollReveal(
  selector = ".reveal, .reveal-left, .reveal-right, .reveal-scale"
) {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.08, rootMargin: "48px 0px 48px 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [selector]);
}
