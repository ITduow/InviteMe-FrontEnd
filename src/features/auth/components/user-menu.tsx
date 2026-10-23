"use client";
import { useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck, ChevronDown, User } from "lucide-react";
import { useCurrentUser } from "../hooks/use-current-user";
import { useLogout } from "../hooks/use-logout";
import { cn } from "@/shared/lib/utils";
import { AccountAvatar } from "./account-avatar";

export function UserMenu() {
  const { user, isLoading } = useCurrentUser();
  const { logout, isLoggingOut } = useLogout();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown")
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    if (event.key === "ArrowUp")
      nextIndex =
        currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="size-9 rounded-full bg-muted" />
        <div className="hidden h-4 w-24 rounded bg-muted sm:block" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Đăng nhập
      </Link>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const inAdminSection = pathname.startsWith("/admin");

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        id="user-menu-button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-menu-content"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-full p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <AccountAvatar name={user.displayName} imageUrl={user.avatarUrl} />
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-none line-clamp-1">{user.displayName}</p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id="user-menu-content"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] origin-top-right rounded-xl border border-border bg-card p-2 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
        >
          {/* User info header */}
          <div className="px-3 py-2 border-b border-border/60">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold truncate">{user.displayName}</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary-hover">
                  <ShieldCheck className="size-3" />
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/account"
              role="menuitem"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <User className="size-4 text-muted-foreground" />
              Hồ sơ & cài đặt
            </Link>
            {/* Navigation links based on role */}
            {isAdmin &&
              (inAdminSection ? (
                <Link
                  href="/dashboard"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <User className="size-4 text-muted-foreground" />
                  Không gian Cưới hỏi
                </Link>
              ) : (
                <Link
                  href="/admin/dashboard"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  Trang Quản trị (Admin)
                </Link>
              ))}
          </div>

          {/* Logout button */}
          <div className="border-t border-border/60 pt-1">
            <button
              type="button"
              role="menuitem"
              id="user-logout-button"
              tabIndex={-1}
              disabled={isLoggingOut}
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <LogOut className="size-4" />
              {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
