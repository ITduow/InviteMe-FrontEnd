"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarHeart,
  ExternalLink,
  HeartHandshake,
  PanelsTopLeft,
  SlidersHorizontal,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePermission } from "@/shared/components/permission-guard";
import { useWorkspaceContext } from "@/shared/layout/workspace-context";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { WeddingPermission } from "@/core/auth/auth.types";
import { useRuntime } from "@/core/config/runtime";
import { getWeddingSetup } from "../api/wedding.api";
import { weddingKeys } from "../api/wedding.keys";
import { getWebsite } from "../api/website.api";

type WeddingSection = {
  slug: string;
  label: string;
  permission: WeddingPermission;
  group: string;
  ownerOnly?: boolean;
  wideOnly?: boolean;
};

const navigationGroups: { label: string; shortLabel: string; icon: LucideIcon }[] = [
  { label: "Workspace", shortLabel: "Workspace", icon: CalendarHeart },
  { label: "Guests & invitations", shortLabel: "Guests & RSVP", icon: UsersRound },
  { label: "Reception", shortLabel: "Reception", icon: UtensilsCrossed },
  { label: "Manage", shortLabel: "Manage", icon: SlidersHorizontal },
];

const sections: WeddingSection[] = [
  { slug: "overview", label: "Overview", permission: "WEDDING_VIEW", group: "Workspace" },
  {
    slug: "website",
    label: "Website",
    permission: "WEDDING_EDIT",
    group: "Workspace",
    ownerOnly: true,
  },
  { slug: "guests", label: "Guests", permission: "GUEST_VIEW", group: "Guests & invitations" },
  {
    slug: "invitations",
    label: "Invitations",
    permission: "INVITATION_SEND",
    group: "Guests & invitations",
  },
  { slug: "rsvp", label: "RSVP", permission: "RSVP_VIEW", group: "Guests & invitations" },
  {
    slug: "rsvp/reminders",
    label: "RSVP reminders",
    permission: "RSVP_VIEW",
    group: "Guests & invitations",
    wideOnly: true,
  },
  { slug: "waitlist", label: "Waitlist", permission: "RSVP_VIEW", group: "Guests & invitations" },
  { slug: "seating", label: "Seating", permission: "SEATING_VIEW", group: "Reception" },
  { slug: "check-in", label: "Check-in", permission: "CHECKIN_MANAGE", group: "Reception" },
  { slug: "gifts", label: "Gifts & wishes", permission: "GIFT_VIEW", group: "Reception" },
  {
    slug: "thank-you",
    label: "Thank-you letters",
    permission: "GUEST_VIEW",
    group: "Manage",
    ownerOnly: true,
  },
  {
    slug: "analytics",
    label: "Check-in overview",
    permission: "RSVP_VIEW",
    group: "Reception",
  },
  {
    slug: "audit-logs",
    label: "Activity history",
    permission: "WEDDING_VIEW",
    group: "Manage",
    ownerOnly: true,
  },
  {
    slug: "settings",
    label: "Settings",
    permission: "WEDDING_EDIT",
    group: "Manage",
    ownerOnly: true,
  },
  {
    slug: "co-hosts",
    label: "Co-hosts",
    permission: "WEDDING_EDIT",
    group: "Manage",
    ownerOnly: true,
  },
];

function statusPresentation(status: string, isWebsiteStatus: boolean) {
  switch (status) {
    case "DRAFT":
      return {
        label: isWebsiteStatus ? "Chưa xuất bản" : "Đang chuẩn bị",
        className: "bg-warning/45 text-warning-foreground",
      };
    case "PUBLISHED":
      return { label: "Đã xuất bản", className: "bg-success/45 text-success-foreground" };
    case "UNPUBLISHED":
      return { label: "Đã tạm ẩn", className: "bg-petal text-muted-foreground" };
    default:
      return { label: status, className: "bg-petal text-foreground" };
  }
}

function formatEventDate(value: string | null, timeZone: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone }).format(
    new Date(value),
  );
}

export function WeddingNavigation({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const { can, isOwner, isWeddingWide } = usePermission();
  const { setWedding } = useWorkspaceContext();
  const pathname = usePathname();
  const weddingPath = `/weddings/${encodeURIComponent(weddingId)}`;
  const wedding = useQuery({
    queryKey: weddingKeys.detail(weddingId),
    queryFn: ({ signal }) => getWeddingSetup(api, weddingId, signal),
  });
  const website = useQuery({
    queryKey: ["website", weddingId],
    queryFn: ({ signal }) => getWebsite(api, weddingId, signal),
    enabled: isOwner,
  });
  const available = useMemo(
    () =>
      sections.filter(
        (section) =>
          can(section.permission) &&
          (!section.ownerOnly || isOwner) &&
          (!section.wideOnly || isWeddingWide(section.permission)),
      ),
    [can, isOwner, isWeddingWide],
  );
  const currentSection = useMemo(
    () =>
      [...available]
        .sort((left, right) => right.slug.length - left.slug.length)
        .find((section) => {
          const href = `${weddingPath}/${section.slug}`;
          return pathname === href || pathname.startsWith(`${href}/`);
        }),
    [available, pathname, weddingPath],
  );
  const [manualGroupOverride, setManualGroupOverride] = useState<{
    pathname: string;
    group: string;
  } | null>(null);
  const selectedGroup =
    manualGroupOverride?.pathname === pathname
      ? manualGroupOverride.group
      : (currentSection?.group ?? "Workspace");
  const activeGroup = navigationGroups.find((group) => group.label === selectedGroup);
  const selectedSections = available.filter((section) => section.group === selectedGroup);
  const status = wedding.data
    ? statusPresentation(website.data?.status ?? wedding.data.status, website.data !== undefined)
    : null;

  useEffect(() => {
    if (wedding.data) {
      const landingSection =
        available.find((section) => section.slug === "overview") ?? available[0];
      const href = landingSection ? `${weddingPath}/${landingSection.slug}` : undefined;
      setWedding((current) => {
        if (
          current?.id === wedding.data.id &&
          current.name === wedding.data.name &&
          current.status === wedding.data.status &&
          current.href === href
        ) {
          return current;
        }
        return {
          id: wedding.data.id,
          name: wedding.data.name,
          status: wedding.data.status,
          href,
        };
      });
      return;
    }
    setWedding((current) => (current?.id === weddingId ? null : current));
  }, [available, setWedding, wedding.data, weddingId, weddingPath]);

  return (
    <section aria-label="Wedding workspace" className="mb-7">
      <header className="flex flex-col gap-4 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-petal text-primary-hover">
            <HeartHandshake className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Wedding workspace
            </p>
            <h1 className="mt-1 truncate font-display text-xl tracking-tight text-foreground sm:text-2xl">
              {wedding.data?.name ?? (wedding.isError ? "Wedding workspace" : "Đang tải wedding…")}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {status && (
                <span
                  className={cn(
                    "inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-medium",
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              )}
              {wedding.data?.eventDateTime && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarHeart className="size-3.5" aria-hidden="true" />
                  {formatEventDate(wedding.data.eventDateTime, wedding.data.timeZoneId)}
                </span>
              )}
            </div>
          </div>
        </div>
        {isOwner && can("WEDDING_EDIT") && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              asChild
              variant="outline"
              className="min-h-10 rounded-xl border-border/90 bg-card"
            >
              <Link href={`${weddingPath}/website`}>
                <PanelsTopLeft aria-hidden="true" />
                Chỉnh sửa website
              </Link>
            </Button>
            {website.data?.status === "PUBLISHED" && wedding.data?.slug && (
              <Button asChild className="min-h-10 rounded-xl">
                <Link
                  href={`/wedding/${encodeURIComponent(wedding.data.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink aria-hidden="true" />
                  Mở trang cưới
                </Link>
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          aria-label="Wedding feature groups"
          className="flex min-w-max gap-1 border-b border-border/70"
        >
          {navigationGroups.map(({ label, shortLabel, icon: Icon }) => {
            const count = available.filter((section) => section.group === label).length;
            if (count === 0) return null;
            const active = selectedGroup === label;
            return (
              <button
                key={label}
                type="button"
                aria-label={`${shortLabel}, ${count} mục`}
                aria-pressed={active}
                onClick={() => setManualGroupOverride({ pathname, group: label })}
                className={cn(
                  "inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  active
                    ? "border-primary-hover font-semibold text-primary-hover"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeGroup && (
        <nav
          aria-label={`${activeGroup.label} features`}
          className="border-b border-border/70 py-2"
        >
          <ul className="flex flex-wrap gap-1">
            {selectedSections.map((section) => {
              const href = `${weddingPath}/${section.slug}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={section.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-10 items-center rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active
                        ? "bg-petal font-semibold text-primary-hover"
                        : "text-foreground hover:bg-petal/70",
                    )}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </section>
  );
}
