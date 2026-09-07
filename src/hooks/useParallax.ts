import { useEffect } from "react";

/**
 * Applies a subtle parallax translateY to an element identified by selector
 * based on scroll position. Factor controls strength (e.g. 0.15 = 15% speed).
 */
export function useParallax(
  selector: string,
  factor = 0.15
) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;

    let rafId: number;

    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        el.style.transform = `translateY(${scrollY * factor}px)`;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [selector, factor]);
}
