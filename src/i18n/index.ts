import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

export const RTL_LANGUAGES = ["ar"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar },
    },
    fallbackLng: "fr",
    supportedLngs: ["fr", "ar"],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

// Force French as default on first visit
if (!localStorage.getItem('i18nextLng')) {
  i18n.changeLanguage('fr');
}

// Applique dir="rtl"/"ltr" et lang="" sur <html> à chaque changement de langue.
function applyDirection(lng: string) {
  const dir = RTL_LANGUAGES.includes(lng) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lng);
}

applyDirection(i18n.language || "fr");
i18n.on("languageChanged", applyDirection);

export default i18n;
