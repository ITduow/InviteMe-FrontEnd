import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth";
export const metadata: Metadata = { title: "Đăng ký" };
export default function Page() {
  return <RegisterForm />;
}
