"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Heart, Mail, Users, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRuntime } from "@/core/config/runtime";
import { PageHeader } from "@/shared/components/page-header";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { formatNumber } from "@/i18n/format";
import { useLocale } from "@/i18n/language-context";
import { adminApi } from "../api/admin.api";

const quickLinks = [
  ["accounts", "/admin/users", "reviewAccounts"],
  ["weddings", "/admin/weddings", "searchWeddings"],
  ["templates", "/admin/templates", "manageTemplates"],
  ["rolesPermissions", "/admin/access-control", "reviewPermissions"],
  ["auditLogs", "/admin/audit-logs", "reviewAudit"],
] as const;
type Metric = { label: string; value: number; detail: string; icon: LucideIcon };

export function AdminDashboard() {
  const { t } = useTranslation("admin");
  const { language } = useLocale();
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
      {dashboard.isPending && <LoadingState label={t("loadingOverview")} />}
      {dashboard.isError && (
        <ErrorState error={dashboard.error} retry={() => void dashboard.refetch()} />
      )}
      {dashboard.data && (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label={t("platformMetrics")}
          >
            {(
              [
                {
                  label: "accounts",
                  value: dashboard.data.totalAccounts,
                  detail: `${formatNumber(dashboard.data.activeAccounts, language)} ${t("active")} · ${formatNumber(dashboard.data.suspendedAccounts, language)} ${t("suspended")}`,
                  icon: Users,
                },
                {
                  label: "weddings",
                  value: dashboard.data.totalWeddings,
                  detail: `${formatNumber(dashboard.data.draftWeddings, language)} ${t("draftCount")} · ${formatNumber(dashboard.data.publishedWeddings, language)} ${t("published")}`,
                  icon: CalendarDays,
                },
                {
                  label: "weddingGuests",
                  value: dashboard.data.activeGuests,
                  detail: t("activeGuestRecords"),
                  icon: Heart,
                },
                {
                  label: "invitationsSent",
                  value: dashboard.data.invitationsSent,
                  detail: t("successfulMessages"),
                  icon: Mail,
                },
              ] satisfies Metric[]
            ).map(({ label, value, detail, icon: Icon }) => (
              <article key={label} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm text-muted-foreground">{t(label)}</h2>
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <p className="mt-4 text-3xl font-semibold tabular-nums">
                  {formatNumber(value, language)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              </article>
            ))}
          </section>
          <section
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            aria-label={t("adminAreas")}
          >
            {quickLinks.map(([titleKey, href, descriptionKey]) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{t(titleKey)}</h2>
                  <ArrowRight
                    className="size-4 text-primary transition group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(descriptionKey)}</p>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
