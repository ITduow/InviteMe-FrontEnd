"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { PlatformRole } from "@/core/auth/auth.types";
import { useCurrentUser } from "../hooks/use-current-user";
import { LoadingState } from "@/shared/feedback/loading-state";

/**
 * Client-side route guard.
 *
 * Checks in-memory session status and current user profile:
 * 1. While the session is being restored (or profile query is loading), displays a clean loading state.
 * 2. If not authenticated after session restore, redirects to `/login` with `returnTo`.
 * 3. If a specific `role` is required (e.g. "ADMIN") and user does not have it, redirects to `/dashboard`.
 * 4. Otherwise, renders children.
 *
 * Security note: Client guards are UX boundaries. Every API endpoint and hub method
 * independently enforces JWT authentication, role claims, and revocation.
 */
export function AuthGuard({ children, role }: { children: ReactNode; role?: PlatformRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isRestored, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isRestored) return;

    if (!isAuthenticated) {
      const returnTo = pathname || "/dashboard";
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (role && user && user.role !== role) {
      // Forbidden: redirect user to their authorized dashboard
      router.replace("/dashboard");
    }
  }, [isRestored, isAuthenticated, user, role, pathname, router]);

  // Show loading while restoring session or fetching user details
  if (!isRestored || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState label="Đang kiểm tra quyền truy cập…" />
      </div>
    );
  }

  // Not authenticated — will be redirected by useEffect
  if (!isAuthenticated) {
    return null;
  }

  // Unauthorized role — will be redirected by useEffect
  if (role && user?.role !== role) {
    return null;
  }

  return <>{children}</>;
}
