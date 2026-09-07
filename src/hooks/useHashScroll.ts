import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useHashScroll() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Un court délai pour laisser le temps au DOM de se construire
      setTimeout(() => {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      // Scroll to top if there's no hash (e.g. changing pages)
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname, hash]);
}
