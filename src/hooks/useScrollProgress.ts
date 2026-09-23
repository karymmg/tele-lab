import { useEffect } from "react";

/**
 * Use a native scroll timeline where available and a coalesced rAF fallback elsewhere.
 */
export function useScrollProgress(selector = ".tl-scroll-bar") {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(selector);
    if (!bar) return;

    const canUseNativeTimeline =
      window.matchMedia("(prefers-reduced-motion: no-preference)").matches &&
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline: scroll(root block)");
    if (canUseNativeTimeline) return;

    let frameId = 0;
    const update = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollTop / docHeight : 0;
        bar.style.transform = `scaleX(${progress})`;
      });
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [selector]);
}
