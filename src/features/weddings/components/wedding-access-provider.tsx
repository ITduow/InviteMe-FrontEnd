"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { WeddingAccessContext } from "@/shared/components/permission-guard";
import { SessionLoading } from "@/shared/feedback/session-loading";
import { ErrorState } from "@/shared/feedback/error-state";
import { getWeddingAccess } from "../api/wedding.api";

export function WeddingAccessProvider({
  weddingId,
  children,
}: {
  weddingId: string;
  children: ReactNode;
}) {
  const { api, session } = useRuntime();
  const generation = useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.getGeneration(),
    () => 0,
  );
  const access = useQuery({
    queryKey: ["weddings", "access", weddingId, generation],
    queryFn: ({ signal }) => getWeddingAccess(api, weddingId, signal),
    enabled: session.authenticated,
    staleTime: 0,
  });
  if (!session.authenticated || access.isPending) return <SessionLoading />;
  if (access.isError)
    return <ErrorState error={access.error} retry={() => void access.refetch()} />;
  return <WeddingAccessContext value={access.data}>{children}</WeddingAccessContext>;
}
