import type { WeddingListRequest } from "./wedding.api";
export const weddingKeys = {
  all: ["weddings"] as const,
  lists: () => [...weddingKeys.all, "list"] as const,
  list: (params: WeddingListRequest) => [...weddingKeys.lists(), params] as const,
  detail: (weddingId: string) => [...weddingKeys.all, "detail", weddingId] as const,
  slug: (slug: string, weddingId?: string) =>
    [...weddingKeys.all, "slug", slug, weddingId] as const,
};
