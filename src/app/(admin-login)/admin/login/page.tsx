import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/auth";
import { LanguageSwitcher } from "@/shared/components/language-switcher";

export const metadata: Metadata = {
  title: "Đăng nhập Admin",
  description: "Đăng nhập vào cổng quản trị InviteMe.",
};

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <LanguageSwitcher className="absolute right-5 top-5" />
      <AdminLoginForm />
    </main>
  );
}
