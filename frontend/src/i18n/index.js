"use client";

import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "./locales/en.json";
import si from "./locales/si.json";
import ta from "./locales/ta.json";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "si", label: "සිංහල" },
  { code: "ta", label: "தமிழ்" },
];
export const LANG_KEY = "mediflow.lang";

const resources = { en: { translation: en }, si: { translation: si }, ta: { translation: ta } };

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    supportedLngs: LANGS.map((l) => l.code),
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
} else {
  // The i18next singleton outlives hot reloads, so refresh its strings when the locale files change.
  for (const [lng, { translation }] of Object.entries(resources)) i18n.addResourceBundle(lng, "translation", translation, true, true);
}

/** Translation hook: `t`, current `lang`, and `setLang` (persists + updates <html lang>). */
export function useT() {
  const { t, i18n: inst } = useTranslation();
  const lang = inst.resolvedLanguage || "en";
  const setLang = (code) => {
    if (!LANGS.some((l) => l.code === code)) return;
    inst.changeLanguage(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {}
    document.documentElement.lang = code;
  };
  return { t, lang, setLang };
}

export default i18n;
