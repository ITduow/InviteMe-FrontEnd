"use client";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useRuntime } from "@/core/config/runtime";
import { WeddingAccessContext } from "@/shared/components/permission-guard";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { EmptyState } from "@/shared/feedback/empty-state";
import { authApi, authKeys } from "../api/auth.api";
export function WeddingAccessBoundary({
  weddingId,
  children,
}: {
  weddingId: string;
  children: ReactNode;
}) {
  const { api } = useRuntime();
  const access = useQuery({
    queryKey: authKeys.access(weddingId),
    queryFn: ({ signal }) => authApi.access(api, weddingId, signal),
  });
  if (access.isError)
    return <ErrorState error={access.error} retry={() => void access.refetch()} />;
  if (!access.data) return <LoadingState label="Checking wedding access…" />;
  if (access.data.weddingId !== weddingId || !access.data.permissions.includes("WEDDING_VIEW"))
    return (
      <EmptyState title="Access restricted" description="You do not have access to this wedding." />
    );
  return <WeddingAccessContext value={access.data}>{children}</WeddingAccessContext>;
}
