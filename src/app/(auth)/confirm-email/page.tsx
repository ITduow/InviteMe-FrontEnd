import { Suspense } from "react";
import type { Metadata } from "next";
import { ConfirmEmailForm } from "@/features/auth";
export const metadata: Metadata = {
  title: "Xác nhận email",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Đang mở link xác nhận…</p>}>
      <ConfirmEmailForm />
    </Suspense>
  );
}
