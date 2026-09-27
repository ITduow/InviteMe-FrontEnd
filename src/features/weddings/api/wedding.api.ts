import type { ApiClient } from "@/core/api/api-client";
import type { PageRequest } from "@/core/api/api-types";
import { weddingListSchema } from "../schemas/wedding.schema";
export function getWeddings(api: ApiClient, params: PageRequest, signal?: AbortSignal) {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    search: params.search ?? "",
    sort: params.sort ?? "weddingDate",
  });
  return api.request(`/weddings?${search}`, { signal, schema: weddingListSchema });
}
