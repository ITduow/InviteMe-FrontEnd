"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isLanguage, languageCookieName, languageStorageKey, type Language } from "./config";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  language,
  setLanguage,
  children,
}: LanguageContextValue & { children: ReactNode }) {
  return <LanguageContext value={{ language, setLanguage }}>{children}</LanguageContext>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}

export function useLocale() {
  const { i18n } = useTranslation();
  const { language, setLanguage: updateLanguage } = useLanguage();

  const setLanguage = useCallback(
    (nextLanguage: Language) => {
      if (!isLanguage(nextLanguage)) return;
      updateLanguage(nextLanguage);
      void i18n.changeLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage;
      window.localStorage.setItem(languageStorageKey, nextLanguage);
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${languageCookieName}=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    },
    [i18n, updateLanguage],
  );

  return { language, setLanguage };
}
