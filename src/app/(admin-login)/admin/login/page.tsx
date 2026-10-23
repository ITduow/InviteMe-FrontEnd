import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Đăng nhập Admin | InviteMe",
  description: "Đăng nhập vào cổng quản trị InviteMe.",
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <AdminLoginForm />
    </main>
  );
}
