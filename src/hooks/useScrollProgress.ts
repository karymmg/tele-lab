import { useEffect } from "react";

/**
 * Updates a CSS custom property --scroll-progress (0 to 1) on :root,
 * and applies a scaleX transform to an element matching selector.
 */
export function useScrollProgress(selector = ".tl-scroll-bar") {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(selector);
    if (!bar) return;

    let rafId: number;

    const update = () => {
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollTop / docHeight : 0;
        bar.style.transform = `scaleX(${progress})`;
      });
    };

    window.addEventListener("scroll", update, { passive: true });
    update(); // initial
    return () => {
      window.removeEventListener("scroll", update);
      cancelAnimationFrame(rafId);
    };
  }, [selector]);
}
