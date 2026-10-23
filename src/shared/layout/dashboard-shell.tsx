"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  CalendarHeart,
  ChevronRight,
  Files,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  ShieldCheck,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { BrandLogo } from "@/shared/components/brand-logo";
import { useUiStore } from "@/shared/stores/ui.store";
import { cn } from "@/shared/lib/utils";
import { WorkspaceContextProvider, useWorkspaceContext } from "./workspace-context";

export type NavigationIcon =
  "dashboard" | "calendar" | "users" | "weddings" | "templates" | "permissions" | "audit" | "plans";
export type NavigationItem = { href: string; label: string; icon: NavigationIcon };
export type NavigationGroup = { label: string; items: NavigationItem[] };

const navigationIcons: Record<NavigationIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: CalendarHeart,
  users: Users,
  weddings: UsersRound,
  templates: Files,
  permissions: ShieldCheck,
  audit: ScrollText,
  plans: BadgeDollarSign,
};

const weddingRouteLabels: Record<string, string> = {
  overview: "Overview",
  website: "Website",
  guests: "Guests",
  invitations: "Invitations",
  rsvp: "RSVP",
  "rsvp/reminders": "RSVP reminders",
  waitlist: "Waitlist",
  seating: "Seating",
  "check-in": "Check-in",
  gifts: "Gifts & wishes",
  "thank-you": "Thank-you letters",
  analytics: "Check-in overview",
  "audit-logs": "Activity history",
  settings: "Settings",
  "co-hosts": "Co-hosts",
};

function isActiveRoute(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function createBreadcrumbs(
  pathname: string,
  navigation: NavigationGroup[],
  title: string,
  homeHref: string,
  wedding: ReturnType<typeof useWorkspaceContext>["wedding"],
) {
  const weddingMatch = /^\/weddings\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (weddingMatch) {
    const rawWeddingId = weddingMatch[1];
    const rawSection = weddingMatch[2] ?? "overview";
    if (!rawWeddingId) return [{ label: title, href: "" }];
    const weddingId = decodeURIComponent(rawWeddingId);
    const weddingPath = `/weddings/${encodeURIComponent(weddingId)}`;
    const crumbs = [
      { label: "Weddings", href: "/weddings" },
      {
        label: wedding?.id === weddingId ? wedding.name : "Wedding workspace",
        href: wedding?.id === weddingId ? wedding.href : undefined,
      },
    ];
    const section = decodeURIComponent(rawSection).replace(/\/$/, "");
    if (section !== "overview") {
      const parentSection = section.startsWith("rsvp/") ? "rsvp" : section;
      const parentLabel = weddingRouteLabels[parentSection];
      if (parentLabel && parentSection !== section) {
        crumbs.push({ label: parentLabel, href: `${weddingPath}/${parentSection}` });
      }
      crumbs.push({
        label: weddingRouteLabels[section] ?? "Wedding workspace",
        href: "",
      });
    } else {
      crumbs.push({ label: "Overview", href: "" });
    }
    return crumbs;
  }

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    return [{ label: "Account settings", href: "" }];
  }

  const items = navigation.flatMap((group) => group.items);
  const current = items
    .filter((item) => isActiveRoute(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0];
  if (!current) return [{ label: title, href: "" }];
  if (pathname === current.href || current.href === homeHref) {
    return [{ label: current.label, href: "" }];
  }
  const homeItem = items.find((item) => item.href === homeHref);
  return [
    { label: homeItem?.label ?? title, href: homeHref },
    { label: current.label, href: "" },
  ];
}

function WorkspaceBreadcrumbs({
  pathname,
  navigation,
  title,
  homeHref,
}: {
  pathname: string;
  navigation: NavigationGroup[];
  title: string;
  homeHref: string;
}) {
  const { wedding } = useWorkspaceContext();
  const crumbs = useMemo(
    () => createBreadcrumbs(pathname, navigation, title, homeHref, wedding),
    [homeHref, navigation, pathname, title, wedding],
  );

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="hidden size-3.5 shrink-0 text-muted-foreground/70 sm:block"
                  aria-hidden="true"
                />
              )}
              {crumb.href && !current ? (
                <Link
                  href={crumb.href}
                  className="hidden shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "min-w-0 truncate",
                    current ? "font-semibold text-foreground" : "text-muted-foreground sm:hidden",
                  )}
                  title={crumb.label}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function DashboardShellFrame({
  children,
  navigation,
  account,
  title,
  homeHref,
}: {
  children: ReactNode;
  navigation: NavigationGroup[];
  account: ReactNode;
  title: string;
  homeHref: string;
}) {
  const pathname = usePathname();
  const open = useUiStore((state) => state.sidebarOpen);
  const setOpen = useUiStore((state) => state.setSidebarOpen);
  const [collapsed, setCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !sidebarRef.current) return;

      const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not(:disabled)",
      );
      const visible = Array.from(focusable).filter(
        (element) => element.getClientRects().length > 0,
      );
      const first = visible[0];
      const last = visible.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <div
      className={cn(
        "min-h-screen md:grid",
        collapsed ? "md:grid-cols-[4.5rem_minmax(0,1fr)]" : "md:grid-cols-[15rem_minmax(0,1fr)]",
      )}
    >
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-foreground/30 backdrop-blur-[2px] md:hidden"
          aria-label="Đóng menu điều hướng"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        id="dashboard-navigation"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={title}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-border/80 bg-card px-4 py-4 shadow-xl transition-[transform,visibility,width] duration-200 motion-reduce:transition-none md:sticky md:top-0 md:z-auto md:h-screen md:w-auto md:translate-x-0 md:shadow-none",
          open
            ? "visible translate-x-0"
            : "invisible -translate-x-full md:visible md:translate-x-0",
          collapsed ? "md:px-2" : "md:px-5",
        )}
      >
        <div
          className={cn(
            "mb-8 flex min-h-11 items-center justify-between gap-2",
            collapsed && "md:justify-center",
          )}
        >
          <BrandLogo href={homeHref} size="md" markOnly={collapsed} />
          <div className="flex items-center gap-1">
            <Button
              ref={closeButtonRef}
              variant="ghost"
              size="icon"
              className="size-11 md:hidden"
              aria-label="Đóng menu điều hướng"
              onClick={() => {
                setOpen(false);
                menuButtonRef.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-10 shrink-0 md:inline-flex"
              aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              aria-expanded={!collapsed}
              aria-controls="dashboard-navigation"
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden="true" />
              ) : (
                <PanelLeftClose aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <p
          className={cn(
            "mb-5 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
            collapsed && "md:sr-only",
          )}
        >
          {title}
        </p>
        <nav aria-label={title} className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-3">
          {navigation.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2
                className={cn(
                  "mb-2 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                  collapsed && "md:sr-only",
                )}
              >
                {group.label}
              </h2>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActiveRoute(pathname, item.href);
                  const Icon = navigationIcons[item.icon];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "md:justify-start",
                        collapsed && "md:justify-center md:px-0",
                        active
                          ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-petal/80 hover:text-primary-hover",
                      )}
                    >
                      <Icon className="size-[1.125rem] shrink-0" aria-hidden="true" />
                      <span className={cn(collapsed && "md:sr-only")}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
        <p className={cn("mt-3 px-2 text-xs text-muted-foreground", collapsed && "md:sr-only")}>
          Dành cho những ngày vui đáng nhớ.
        </p>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-3 backdrop-blur sm:px-5 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:hidden"
              aria-label="Mở menu điều hướng"
              aria-expanded={open}
              aria-controls="dashboard-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu aria-hidden="true" />
            </Button>
            <BrandLogo href={homeHref} size="sm" markOnly className="shrink-0 sm:hidden" />
            <WorkspaceBreadcrumbs
              pathname={pathname}
              navigation={navigation}
              title={title}
              homeHref={homeHref}
            />
          </div>
          <div className="shrink-0">{account}</div>
        </header>
        <main
          id="main-content"
          className="mx-auto min-h-[calc(100svh-4rem)] max-w-[1600px] p-4 sm:p-6 lg:p-8 xl:p-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  navigation,
  account,
  title = "Wedding workspace",
  homeHref = "/dashboard",
}: {
  children: ReactNode;
  navigation: NavigationGroup[];
  account: ReactNode;
  title?: string;
  homeHref?: string;
}) {
  return (
    <WorkspaceContextProvider>
      <DashboardShellFrame
        navigation={navigation}
        account={account}
        title={title}
        homeHref={homeHref}
      >
        {children}
      </DashboardShellFrame>
    </WorkspaceContextProvider>
  );
}
