"use client";
import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WeddingListRequest } from "../api/wedding.api";
import { useRuntime } from "@/core/config/runtime";
import { getWeddings } from "../api/wedding.api";
import { weddingKeys } from "../api/wedding.keys";
export function useWeddings(params: WeddingListRequest) {
  const { api, session } = useRuntime();
  const sessionGeneration = useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.getGeneration(),
    () => 0,
  );
  const isAuthenticated = useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.authenticated,
    () => false,
  );

  return useQuery({
    // A wedding list belongs to the current account. Do not reuse a previous
    // account's cached list after login or session recovery.
    queryKey: [...weddingKeys.list(params), sessionGeneration],
    queryFn: ({ signal }) => getWeddings(api, params, signal),
    enabled: isAuthenticated,
    staleTime: 0,
  });
}
