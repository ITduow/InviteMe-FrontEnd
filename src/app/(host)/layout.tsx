import type { ReactNode } from "react";
import { AuthGuard, UserMenu } from "@/features/auth";
import { DashboardShell } from "@/shared/layout/dashboard-shell";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell
        navigation={[
          {
            label: "Workspace",
            items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }],
          },
          {
            label: "Wedding management",
            items: [{ href: "/weddings", label: "Weddings", icon: "calendar" }],
          },
        ]}
        account={<UserMenu />}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
