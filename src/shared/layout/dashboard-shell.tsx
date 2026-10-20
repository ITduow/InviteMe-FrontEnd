"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Flower2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { useUiStore } from "@/shared/stores/ui.store";
import { cn } from "@/shared/lib/utils";
export type NavigationItem = { href: string; label: string };
export function DashboardShell({
  children,
  navigation,
  account,
  title = "Wedding workspace",
  homeHref = "/dashboard",
}: {
  children: ReactNode;
  navigation: NavigationItem[];
  account: ReactNode;
  title?: string;
  homeHref?: string;
}) {
  const pathname = usePathname();
  const open = useUiStore((state) => state.sidebarOpen);
  const setOpen = useUiStore((state) => state.setSidebarOpen);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      className={cn(
        "min-h-screen md:grid",
        collapsed ? "md:grid-cols-1" : "md:grid-cols-[15rem_1fr]",
      )}
    >
      <header className="flex items-center justify-between border-b bg-card p-4 md:hidden">
        <Link href={homeHref} className="font-display text-xl">
          InviteMe
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="dashboard-navigation"
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </Button>
      </header>
      <aside
        id="dashboard-navigation"
        className={cn(
          "border-r bg-card p-6",
          !open && "hidden",
          collapsed ? "md:hidden" : "md:block",
        )}
      >
        <div className="mb-12 hidden items-center justify-between gap-2 md:flex">
          <Link href={homeHref} className="flex items-center gap-2 font-display text-2xl">
            <Flower2 className="size-6 text-primary" aria-hidden="true" />
            InviteMe
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Thu gọn thanh điều hướng"
            title="Thu gọn thanh điều hướng"
            aria-expanded={!collapsed}
            aria-controls="dashboard-navigation"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose aria-hidden="true" />
          </Button>
        </div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <nav aria-label={title} className="space-y-2">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-3 text-sm hover:bg-muted",
                  active && "bg-muted font-semibold text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="flex min-h-20 items-center justify-end border-b bg-card px-6">
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-auto hidden md:inline-flex"
              aria-label="Mở thanh điều hướng"
              title="Mở thanh điều hướng"
              aria-expanded={!collapsed}
              aria-controls="dashboard-navigation"
              onClick={() => setCollapsed(false)}
            >
              <PanelLeftOpen aria-hidden="true" />
            </Button>
          )}
          {account}
        </div>
        <main id="main-content" className="mx-auto max-w-7xl p-5 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
