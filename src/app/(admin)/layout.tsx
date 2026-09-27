import type { ReactNode } from "react";
import { AuthGuard, AccountMenu } from "@/features/auth";
import { DashboardShell } from "@/shared/layout/dashboard-shell";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard role="ADMIN">
      <DashboardShell
        title="Administration"
        account={<AccountMenu />}
        navigation={[
          { href: "/admin/dashboard", label: "Dashboard" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/templates", label: "Templates" },
          { href: "/admin/plans", label: "Plans" },
          { href: "/admin/audit-logs", label: "Audit logs" },
        ]}
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
