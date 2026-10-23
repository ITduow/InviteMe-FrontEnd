import i18next, { type i18n } from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLanguage, type Language } from "./config";
import { namespaces, resources } from "./resources";

export function createI18nInstance(language: Language): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: defaultLanguage,
    supportedLngs: ["vi", "en"],
    defaultNS: "common",
    ns: namespaces,
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}
