import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào tài khoản InviteMe để chuẩn bị ngày cưới của bạn.",
};

// LoginForm uses useSearchParams() — Suspense boundary is required in Next.js
// App Router when a Client Component reads searchParams.
export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
