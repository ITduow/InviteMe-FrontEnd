"use client";

import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage, useLocale } from "@/i18n/language-context";
import { supportedLanguages } from "@/i18n/config";
import { cn } from "@/shared/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  const { language } = useLanguage();
  const { setLanguage } = useLocale();

  return (
    <label className={cn("relative inline-flex shrink-0 items-center", className)}>
      <Languages
        className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="sr-only">{t("languageAria")}</span>
      <select
        aria-label={t("languageAria")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as (typeof supportedLanguages)[number])}
        className="min-h-10 cursor-pointer appearance-none rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {supportedLanguages.map((code) => (
          <option key={code} value={code}>
            {t(`languages.${code}`)}
            {language === code ? " ✓" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
