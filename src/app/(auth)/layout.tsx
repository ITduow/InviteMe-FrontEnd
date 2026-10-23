import type { ReactNode } from "react";
import { BrandLogo } from "@/shared/components/brand-logo";
import { LanguageSwitcher } from "@/shared/components/language-switcher";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      className="auth-shell relative flex min-h-screen flex-col items-center justify-center px-5 py-12"
    >
      <LanguageSwitcher className="absolute right-5 top-5" />
      <BrandLogo
        href="/"
        size="lg"
        className="auth-shell__brand mb-8"
        ariaLabel="InviteMe — Trang chủ"
      />
      <div className="auth-shell__panel w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
        {children}
      </div>
    </main>
  );
}
