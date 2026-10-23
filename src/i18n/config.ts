export const supportedLanguages = ["vi", "en"] as const;

export type Language = (typeof supportedLanguages)[number];

export const defaultLanguage: Language = "vi";
export const languageCookieName = "inviteme-language";
export const languageStorageKey = "inviteme.language";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && supportedLanguages.some((language) => language === value);
}

export function getIntlLocale(language: Language): string {
  return language === "en" ? "en-US" : "vi-VN";
}
