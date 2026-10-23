import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Providers } from "./providers";
import "./globals.css";
import { defaultLanguage, isLanguage, languageCookieName } from "@/i18n/config";
export async function generateMetadata(): Promise<Metadata> {
  const savedLanguage = (await cookies()).get(languageCookieName)?.value;
  const language = isLanguage(savedLanguage) ? savedLanguage : defaultLanguage;

  return {
    title: { default: "InviteMe", template: "%s | InviteMe" },
    description:
      language === "en"
        ? "Create a wedding website and online invitations made for your celebration."
        : "Tạo website cưới và lời mời trực tuyến thật riêng cho ngày vui của hai bạn.",
    icons: {
      icon: "/images/brand/inviteme-logo.png",
      apple: "/images/brand/inviteme-logo.png",
    },
  };
}
export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const savedLanguage = cookieStore.get(languageCookieName)?.value;
  const language = isLanguage(savedLanguage) ? savedLanguage : defaultLanguage;

  return (
    <html lang={language}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4"
        >
          {language === "en" ? "Skip to main content" : "Bỏ qua đến nội dung chính"}
        </a>
        <Providers initialLanguage={language}>{children}</Providers>
      </body>
    </html>
  );
}
