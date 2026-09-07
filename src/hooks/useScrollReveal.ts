import { useEffect } from "react";

/**
 * Attaches an IntersectionObserver to all elements matching the selector
 * and toggles `is-visible` when they enter/leave the viewport.
 */
export function useScrollReveal(
  selector = ".reveal, .reveal-left, .reveal-right, .reveal-scale"
) {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(selector);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "-20px 0px" } // Adjust as needed
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selector]);
}
