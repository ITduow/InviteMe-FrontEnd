"use client";

import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { getPublicWebsite, publicWebsiteSchema, WebsiteRenderer } from "@/features/weddings";
import { usePublicWeddingSignal } from "@/core/realtime/public-wedding-signal";
import type { z } from "zod";

export function PublicWebsiteClient({ slug, initial }: { slug: string; initial?: z.infer<typeof publicWebsiteSchema> }) {
  const { api, queryClient } = useRuntime();
  usePublicWeddingSignal("website", slug, () => void queryClient.invalidateQueries({ queryKey: ["public-website", slug] }));
  const site = useQuery({ queryKey: ["public-website", slug],
    queryFn: ({ signal }) => getPublicWebsite(api, slug, signal), initialData: initial, retry: false });
  if (site.isPending) return <main className="p-10 text-center">Đang tải website cưới…</main>;
  if (site.isError) return <main className="p-10 text-center">Website chưa công khai hoặc hiện không thể tải.
    <button className="ml-3 underline" onClick={() => void site.refetch()}>Thử lại</button></main>;
  return <WebsiteRenderer document={site.data.document} />;
}
