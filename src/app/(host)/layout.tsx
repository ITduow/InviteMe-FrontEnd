import type { ReactNode } from "react";
import { AuthGuard, AccountMenu } from "@/features/auth";
import { DashboardShell } from "@/shared/layout/dashboard-shell";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell
        navigation={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/weddings", label: "Weddings" },
        ]}
        account={<AccountMenu />}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
