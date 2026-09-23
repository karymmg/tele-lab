import { useEffect } from "react";

/**
 * Follow page scroll in both directions using a native view timeline where
 * available. A small rAF fallback updates one shared hero offset on older browsers.
 */
export function useParallax(selector: string, factor = 0.15) {
  useEffect(() => {
    const image = document.querySelector<HTMLElement>(selector);
    const frame = image?.closest<HTMLElement>(".tl-hero__img-frame") ?? image;
    if (!frame) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const compactQuery = window.matchMedia("(max-width: 768px)");
    const supportsViewTimeline =
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline: view(block)") &&
      CSS.supports("animation-range: entry 0% exit 100%");

    if (!motionQuery.matches || supportsViewTimeline) {
      frame.style.removeProperty("--tl-parallax-y");
      return;
    }

    let frameId = 0;
    let isVisible = false;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) queueUpdate();
    }, { rootMargin: "80px 0px" });

    const update = () => {
      frameId = 0;
      if (!isVisible || !motionQuery.matches) return;

      const maxOffset = compactQuery.matches ? 10 : 70;
      const offset = Math.min(maxOffset, window.scrollY * factor);
      frame.style.setProperty("--tl-parallax-y", String(offset.toFixed(2)) + "px");
    };

    const queueUpdate = () => {
      if (!isVisible || frameId || !motionQuery.matches) return;
      frameId = window.requestAnimationFrame(update);
    };
    const onMotionChange = () => {
      if (!motionQuery.matches) frame.style.removeProperty("--tl-parallax-y");
      else queueUpdate();
    };

    observer.observe(frame);
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate, { passive: true });
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      motionQuery.removeEventListener("change", onMotionChange);
      if (frameId) window.cancelAnimationFrame(frameId);
      frame.style.removeProperty("--tl-parallax-y");
    };
  }, [selector, factor]);
}
