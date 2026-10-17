"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck, ChevronDown, User } from "lucide-react";
import { useCurrentUser } from "../hooks/use-current-user";
import { useLogout } from "../hooks/use-logout";
import { cn } from "@/shared/lib/utils";

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return "U";
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

export function UserMenu() {
  const { user, isLoading } = useCurrentUser();
  const { logout, isLoggingOut } = useLogout();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
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
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Đăng nhập
      </Link>
    );
  }

  const initials = getInitials(user.displayName);
  const isAdmin = user.role === "ADMIN";
  const inAdminSection = pathname.startsWith("/admin");

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        id="user-menu-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-full p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 font-medium text-xs text-primary ring-1 ring-primary/20">
          {initials}
        </div>
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
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-border bg-card p-2 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 z-50"
        >
          {/* User info header */}
          <div className="px-3 py-2 border-b border-border/60">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold truncate">{user.displayName}</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <ShieldCheck className="size-3" />
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
          </div>

          <div className="py-1">
            {/* Navigation links based on role */}
            {isAdmin &&
              (inAdminSection ? (
                <Link
                  href="/dashboard"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <User className="size-4 text-muted-foreground" />
                  Không gian Cưới hỏi
                </Link>
              ) : (
                <Link
                  href="/admin/dashboard"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
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
              disabled={isLoggingOut}
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
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
