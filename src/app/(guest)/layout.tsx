import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandLogo } from "@/shared/components/brand-logo";
import { LanguageSwitcher } from "@/shared/components/language-switcher";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="relative min-h-screen bg-background px-5 py-12">
      <LanguageSwitcher className="absolute right-5 top-5" />
      <div className="mx-auto max-w-xl space-y-8">
        <BrandLogo size="md" className="mx-auto justify-center" />
        {children}
      </div>
    </main>
  );
}
