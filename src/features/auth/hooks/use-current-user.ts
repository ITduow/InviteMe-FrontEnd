"use client";
import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { authApi, type AccountDto } from "../api/auth.api";

export const currentUserKeys = {
  me: () => ["auth", "me"] as const,
};

/**
 * Query hook for the authenticated current user.
 *
 * Uses useSyncExternalStore to subscribe to session changes so that the
 * query's `enabled` flag reacts instantly when the user logs in or out —
 * without needing a full React re-render cycle from a parent.
 *
 * - Returns `undefined` while loading.
 * - Returns `null` when the user is not authenticated.
 * - Returns `AccountDto` when authenticated and data is available.
 */
export function useCurrentUser() {
  const { api, session } = useRuntime();

  // Subscribe to session changes so `isRestored` and `authenticated` re-evaluate reactively.
  const isRestored = useSyncExternalStore(
    (onStoreChange) => session.subscribe(onStoreChange),
    () => session.isRestored,
    () => false, // server snapshot
  );

  const authenticated = useSyncExternalStore(
    (onStoreChange) => session.subscribe(onStoreChange),
    () => session.authenticated,
    () => false, // server snapshot — never authenticated on the server
  );

  const query = useQuery<AccountDto | null>({
    queryKey: currentUserKeys.me(),
    queryFn: async (): Promise<AccountDto | null> => {
      if (!session.authenticated) return null;
      return authApi.me(api);
    },
    enabled: authenticated,
    staleTime: 5 * 60 * 1000, // 5 min — user profile rarely changes
    retry: (failureCount, error) => {
      // Do not retry on 401/403 — session was revoked.
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error.status === 401 || error.status === 403)
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const user = authenticated ? (query.data ?? null) : null;

  return {
    ...query,
    data: user,
    user,
    isAuthenticated: authenticated,
    isRestored,
    isLoading: !isRestored || (authenticated && query.isLoading),
  };
}
