import type { Metadata } from "next";
import { AccountSettingsForm } from "@/features/auth";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Tài khoản" };

export default function Page() {
  return (
    <div className="space-y-8">
      <PageHeader title="Tài khoản" description="Quản lý hồ sơ và bảo mật tài khoản InviteMe." />
      <AccountSettingsForm />
    </div>
  );
}
