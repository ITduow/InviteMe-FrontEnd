import type { PageRequest } from "@/core/api/api-types";
export const weddingKeys = {
  all: ["weddings"] as const,
  lists: () => [...weddingKeys.all, "list"] as const,
  list: (params: PageRequest) => [...weddingKeys.lists(), params] as const,
  detail: (weddingId: string) => [...weddingKeys.all, "detail", weddingId] as const,
};
