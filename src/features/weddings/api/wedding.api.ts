import type { ApiClient } from "@/core/api/api-client";
import type { PageRequest } from "@/core/api/api-types";
import { weddingListSchema } from "../schemas/wedding.schema";
import { weddingAccessSchema } from "@/core/auth/auth.types";
export function getWeddingAccess(api: ApiClient, weddingId: string, signal?: AbortSignal) {
  return api.request(`/weddings/${encodeURIComponent(weddingId)}/access`, {
    signal,
    schema: weddingAccessSchema.refine((access) => access.weddingId === weddingId),
  });
}
export function getWeddings(api: ApiClient, params: PageRequest, signal?: AbortSignal) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    search: params.search ?? "",
    sort: params.sort ?? "weddingDate",
  });
  return api.request(`/weddings?${search}`, { signal, schema: weddingListSchema });
}
