"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Flower2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { useUiStore } from "@/shared/stores/ui.store";
import { cn } from "@/shared/lib/utils";
export type NavigationItem = { href: string; label: string };
export function DashboardShell({
  children,
  navigation,
  account,
  title = "Wedding workspace",
}: {
  children: ReactNode;
  navigation: NavigationItem[];
  account: ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const open = useUiStore((state) => state.sidebarOpen);
  const setOpen = useUiStore((state) => state.setSidebarOpen);
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <header className="flex items-center justify-between border-b bg-card p-4 md:hidden">
        <Link href="/" className="font-display text-xl">
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
        className={cn("border-r bg-card p-6 md:block", !open && "hidden")}
      >
        <Link href="/" className="mb-12 hidden items-center gap-2 font-display text-2xl md:flex">
          <Flower2 className="size-6 text-primary" aria-hidden="true" />
          InviteMe
        </Link>
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
          {account}
        </div>
        <main id="main-content" className="mx-auto max-w-7xl p-5 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
