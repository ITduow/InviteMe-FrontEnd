"use client";
import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { getWeddingSetup } from "../api/wedding.api";
import { weddingKeys } from "../api/wedding.keys";

export function useWeddingSetup(weddingId: string, enabled = true) {
  const { api } = useRuntime();
  return useQuery({
    queryKey: weddingKeys.detail(weddingId),
    queryFn: ({ signal }) => getWeddingSetup(api, weddingId, signal),
    enabled: enabled && Boolean(weddingId),
  });
}
