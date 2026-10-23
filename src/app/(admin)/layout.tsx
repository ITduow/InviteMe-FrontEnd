import type { ReactNode } from "react";
import { AdminAuthGuard, UserMenu } from "@/features/auth";
import { DashboardShell } from "@/shared/layout/dashboard-shell";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthGuard>
      <DashboardShell
        title="Administration"
        homeHref="/admin"
        account={<UserMenu />}
        navigation={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/weddings", label: "Weddings" },
          { href: "/admin/templates", label: "Templates" },
          { href: "/admin/access-control", label: "Roles & permissions" },
          { href: "/admin/plans", label: "Plans" },
          { href: "/admin/audit-logs", label: "Audit logs" },
        ]}
      >
        {children}
      </DashboardShell>
    </AdminAuthGuard>
  );
}
