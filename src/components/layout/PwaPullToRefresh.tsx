import { useEffect, useRef, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./PwaPullToRefresh.css";

export function PwaPullToRefresh() {
  const { i18n } = useTranslation();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const distanceRef = useRef(0);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    const root = document.documentElement;
    const previousOverscrollBehavior = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";

    let touchStart: { x: number; y: number } | null = null;
    let frame = 0;
    const atPageTop = () => Math.max(window.scrollY, root.scrollTop) <= 1;
    const updateDistance = (value: number) => {
      distanceRef.current = value;
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setDistance(value));
    };

    const onTouchStart = (event: TouchEvent) => {
      const target = event.target;
      const isInteractiveSurface = target instanceof Element && Boolean(target.closest(
        "input, textarea, select, [contenteditable='true'], [role='dialog'], .tl-header__mobile, .tl-cart-drawer"
      ));
      if (event.touches.length !== 1 || !atPageTop() || isInteractiveSurface) {
        touchStart = null;
        return;
      }
      touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchStart || event.touches.length !== 1) return;
      if (!atPageTop()) {
        touchStart = null;
        updateDistance(0);
        return;
      }
      const touch = event.touches[0];
      const deltaY = touch.clientY - touchStart.y;
      const deltaX = touch.clientX - touchStart.x;
      if (deltaY <= 0 || Math.abs(deltaX) > deltaY) {
        touchStart = null;
        updateDistance(0);
        return;
      }
      if (deltaY > 8) {
        if (event.cancelable) event.preventDefault();
        updateDistance(Math.min(86, Math.round(deltaY * 0.58)));
      }
    };

    const finishPull = () => {
      touchStart = null;
      const shouldRefresh = distanceRef.current >= 58;
      updateDistance(0);
      if (shouldRefresh) {
        setRefreshing(true);
        window.setTimeout(() => window.location.reload(), 180);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", finishPull, { passive: true });
    window.addEventListener("touchcancel", finishPull, { passive: true });
    return () => {
      root.style.overscrollBehaviorY = previousOverscrollBehavior;
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", finishPull);
      window.removeEventListener("touchcancel", finishPull);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const shownDistance = refreshing ? 48 : distance;
  const isArabic = i18n.language === "ar";
  return (
    <div
      className={`tl-pwa-pull-refresh ${refreshing ? "is-refreshing" : ""}`}
      style={{ transform: `translate3d(-50%, ${Math.max(8, shownDistance * 0.35)}px, 0)`, opacity: shownDistance > 0 ? 1 : 0 }}
      role="status"
      aria-live="polite"
      aria-hidden={shownDistance === 0}
    >
      {refreshing
        ? <RefreshCw size={17} className="is-spinning" />
        : <ChevronDown size={18} className={distance >= 58 ? "is-ready" : ""} />}
      <span>{refreshing
        ? (isArabic ? "جاري التحديث…" : "Actualisation…")
        : distance >= 58
          ? (isArabic ? "اترك للتحديث" : "Relâchez pour actualiser")
          : (isArabic ? "اسحب للأسفل للتحديث" : "Tirez vers le bas pour actualiser")}</span>
    </div>
  );
}
