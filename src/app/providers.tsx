"use client";
import { startTransition, useState, useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRuntime, RuntimeContext } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { createI18nInstance } from "@/i18n/client";
import { LanguageProvider } from "@/i18n/language-context";
import type { Language } from "@/i18n/config";
import { I18nextProvider } from "react-i18next";
import { isLanguage, languageCookieName, languageStorageKey } from "@/i18n/config";

export function Providers({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: Language;
}) {
  const [runtime] = useState(createRuntime);
  const [language, setLanguage] = useState(initialLanguage);
  const [i18n] = useState(() => createI18nInstance(initialLanguage));

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    if (!isLanguage(storedLanguage) || storedLanguage === language) return;

    startTransition(() => setLanguage(storedLanguage));
    void i18n.changeLanguage(storedLanguage);
    document.documentElement.lang = storedLanguage;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${languageCookieName}=${storedLanguage}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }, [i18n, language]);

  // On mount, attempt to restore the session via the HttpOnly refresh cookie.
  // This runs once per page load so an authenticated user doesn't lose their
  // session on F5. The result is silently ignored — components read from the
  // query cache via useCurrentUser().
  useEffect(() => {
    void runtime.session.restore();
  }, [runtime.session]);

  const content = (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider language={language} setLanguage={setLanguage}>
        <RuntimeContext value={runtime}>
          <QueryClientProvider client={runtime.queryClient}>{children}</QueryClientProvider>
        </RuntimeContext>
      </LanguageProvider>
    </I18nextProvider>
  );

  if (env.googleClientId) {
    return <GoogleOAuthProvider clientId={env.googleClientId}>{content}</GoogleOAuthProvider>;
  }

  return content;
}
