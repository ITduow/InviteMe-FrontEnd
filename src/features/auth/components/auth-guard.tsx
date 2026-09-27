"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PlatformRole } from "@/core/auth/auth.types";
import { useRuntime, useSessionStatus } from "@/core/config/runtime";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { EmptyState } from "@/shared/feedback/empty-state";
import { useCurrentUser } from "../hooks/use-current-user";
export function AuthGuard({ children, role }: { children: ReactNode; role?: PlatformRole }) {
  const status = useSessionStatus();
  const { session } = useRuntime();
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);
  if (status === "error") return <ErrorState retry={() => void session.bootstrap()} />;
  if (status !== "authenticated") return <LoadingState label="Checking your session…" />;
  if (user.isError) return <ErrorState error={user.error} retry={() => void user.refetch()} />;
  if (!user.data) return <LoadingState />;
  if (role && user.data.role !== role)
    return (
      <EmptyState title="Access restricted" description="Your account cannot access this area." />
    );
  return children;
}
