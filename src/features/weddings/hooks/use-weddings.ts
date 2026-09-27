"use client";
import { useQuery } from "@tanstack/react-query";
import type { PageRequest } from "@/core/api/api-types";
import { useRuntime } from "@/core/config/runtime";
import { getWeddings } from "../api/wedding.api";
import { weddingKeys } from "../api/wedding.keys";
export function useWeddings(params: PageRequest) {
  const { api } = useRuntime();
  return useQuery({
    queryKey: weddingKeys.list(params),
    queryFn: ({ signal }) => getWeddings(api, params, signal),
  });
}
