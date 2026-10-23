"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useCurrentUser } from "../hooks/use-current-user";
import { useLogout } from "../hooks/use-logout";
import { Button } from "@/shared/ui/button";
import { SessionLoading } from "@/shared/feedback/session-loading";

function AdminForbidden() {
  const { logout, isLoggingOut } = useLogout();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/25 text-primary-foreground">
          <ShieldAlert aria-hidden="true" className="size-7" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          403 · Không có quyền
        </p>
        <h1 className="mt-3 font-display text-3xl">Khu vực dành cho quản trị viên</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tài khoản hiện tại không có quyền truy cập cổng Admin InviteMe.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/dashboard">Về trang làm việc</Link>
          </Button>
          <Button type="button" disabled={isLoggingOut} onClick={() => void logout()}>
            {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
          </Button>
        </div>
      </section>
    </main>
  );
}

export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isRestored, isLoading, isError, refetch } = useCurrentUser();

  useEffect(() => {
    if (isRestored && !isAuthenticated) router.replace("/admin/login");
  }, [isRestored, isAuthenticated, router]);

  if (!isRestored || (isAuthenticated && isLoading)) return <SessionLoading />;
  if (!isAuthenticated) return <SessionLoading />;
  if (isError && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <section className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="font-display text-2xl">Không tải được phiên Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kiểm tra kết nối rồi thử tải lại thông tin tài khoản.
          </p>
          <Button className="mt-5" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </section>
      </main>
    );
  }
  if (user?.role !== "ADMIN") return <AdminForbidden />;

  return <>{children}</>;
}
