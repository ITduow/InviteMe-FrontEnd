import type { ReactNode } from "react";
import { AuthGuard, UserMenu } from "@/features/auth";
import { DashboardShell } from "@/shared/layout/dashboard-shell";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell
        navigation={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/weddings", label: "Weddings" },
        ]}
        account={<UserMenu />}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
