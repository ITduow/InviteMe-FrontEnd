"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Heart, Mail, Users, type LucideIcon } from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import { PageHeader } from "@/shared/components/page-header";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { adminApi } from "../api/admin.api";

const quickLinks = [
  ["Accounts", "/admin/users", "Review accounts, suspend access and assign platform roles."],
  ["Weddings", "/admin/weddings", "Search weddings and check their current status."],
  ["Templates", "/admin/templates", "Create, edit, publish or hide invitation templates."],
  [
    "Roles & permissions",
    "/admin/access-control",
    "Review platform roles and wedding-scoped permissions.",
  ],
  ["Audit log", "/admin/audit-logs", "Review sensitive activity across the platform."],
] as const;
type Metric = { label: string; value: number; detail: string; icon: LucideIcon };

export function AdminDashboard() {
  const { api } = useRuntime();
  const dashboard = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: ({ signal }) => adminApi.dashboard(api, signal),
  });
  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform overview"
        description="InviteMe system activity and administration."
      />
      {dashboard.isPending && <LoadingState label="Loading platform overview…" />}
      {dashboard.isError && (
        <ErrorState error={dashboard.error} retry={() => void dashboard.refetch()} />
      )}
      {dashboard.data && (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Platform metrics"
          >
            {(
              [
                {
                  label: "Accounts",
                  value: dashboard.data.totalAccounts,
                  detail: `${dashboard.data.activeAccounts} active · ${dashboard.data.suspendedAccounts} suspended`,
                  icon: Users,
                },
                {
                  label: "Weddings",
                  value: dashboard.data.totalWeddings,
                  detail: `${dashboard.data.draftWeddings} draft · ${dashboard.data.publishedWeddings} published`,
                  icon: CalendarDays,
                },
                {
                  label: "Wedding guests",
                  value: dashboard.data.activeGuests,
                  detail: "Active guest records",
                  icon: Heart,
                },
                {
                  label: "Invitations sent",
                  value: dashboard.data.invitationsSent,
                  detail: "Successful email and SMS jobs",
                  icon: Mail,
                },
              ] satisfies Metric[]
            ).map(({ label, value, detail, icon: Icon }) => (
              <article key={label} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm text-muted-foreground">{label}</h2>
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <p className="mt-4 text-3xl font-semibold tabular-nums">
                  {value.toLocaleString("vi-VN")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              </article>
            ))}
          </section>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Admin areas">
            {quickLinks.map(([title, href, description]) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{title}</h2>
                  <ArrowRight
                    className="size-4 text-primary transition group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
