import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "InviteMe", template: "%s | InviteMe" },
  description: "Tạo website cưới và lời mời trực tuyến thật riêng cho ngày vui của hai bạn.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
