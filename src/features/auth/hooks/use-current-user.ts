"use client";
import { useQuery } from "@tanstack/react-query";
import { useRuntime, useSessionStatus } from "@/core/config/runtime";
import { authApi, authKeys } from "../api/auth.api";
export function useCurrentUser() {
  const { api } = useRuntime();
  const status = useSessionStatus();
  return useQuery({
    queryKey: authKeys.user,
    queryFn: ({ signal }) => authApi.currentUser(api, signal),
    enabled: status === "authenticated",
  });
}
