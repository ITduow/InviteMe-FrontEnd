import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";
import { env } from "@/core/config/env";

export const websiteTemplates = [
  { id: "story-red-velvet", name: "Đỏ nhung", color: "#7d1929", background: "#fff7f2" },
  { id: "story-editorial-61", name: "Editorial", color: "#393435", background: "#f8f5ef" },
  { id: "story-garden-02", name: "Vườn hoa", color: "#4c6750", background: "#f6f9f1" },
  { id: "story-seaside-01", name: "Biển xanh", color: "#356575", background: "#f1f8fa" },
  { id: "story-scarlet-39", name: "Đỏ truyền thống", color: "#9a3030", background: "#fff8ee" },
  { id: "story-sage-53", name: "Lá xô thơm", color: "#627260", background: "#f6f7f0" },
] as const;

export const websiteDocumentSchema = z.object({
  templateId: z.string(), title: z.string(), partnerOne: z.string(), partnerTwo: z.string(),
  story: z.string(), eventAt: z.string(), venueName: z.string(), venueAddress: z.string(),
  heroImageUrl: z.string().nullable(), showStory: z.boolean(), showEvent: z.boolean(),
  contact: z.string().nullable(),
  timeline: z.array(z.object({ title: z.string(), description: z.string() })).nullable().optional(),
  events: z.array(z.object({ name: z.string(), startsAt: z.string(), address: z.string() })).nullable().optional(),
  gallery: z.array(z.string()).nullable().optional(),
  timeZoneId: z.string().nullable().optional(),
});
export const websiteSchema = z.object({
  version: z.number(), document: websiteDocumentSchema.nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "UNPUBLISHED"]),
  hasUnpublishedChanges: z.boolean(), warnings: z.array(z.string()),
});
export const publicWebsiteSchema = z.object({
  slug: z.string(), document: websiteDocumentSchema,
});
export const uploadedMediaSchema = z.object({ id: z.string(), url: z.string() });
export type WebsiteDocument = z.infer<typeof websiteDocumentSchema>;
export type Website = z.infer<typeof websiteSchema>;

const path = (id: string) => `/weddings/${encodeURIComponent(id)}/website`;
export const getWebsite = (api: ApiClient, id: string, signal?: AbortSignal) =>
  api.request(path(id), { signal, schema: websiteSchema });
export const saveWebsite = (api: ApiClient, id: string, expectedVersion: number, document: WebsiteDocument) =>
  api.request(path(id), { method: "PUT", body: { expectedVersion, document }, schema: websiteSchema });
export const publishWebsite = (api: ApiClient, id: string, expectedVersion: number) =>
  api.request(`${path(id)}/publish`, { method: "POST", body: { expectedVersion }, schema: websiteSchema });
export const unpublishWebsite = (api: ApiClient, id: string, expectedVersion: number) =>
  api.request(`${path(id)}/unpublish`, { method: "POST", body: { expectedVersion }, schema: websiteSchema });
export const getPublicWebsite = (api: ApiClient, slug: string, signal?: AbortSignal) =>
  api.request(`/public/weddings/${encodeURIComponent(slug)}`, { auth: "none", signal, schema: publicWebsiteSchema });
export const listWeddingMedia = (api: ApiClient, id: string) =>
  api.request(`/weddings/${encodeURIComponent(id)}/media`, { schema: z.array(uploadedMediaSchema) });
export const uploadWeddingMedia = (api: ApiClient, id: string, file: File) => {
  const body = new FormData(); body.set("file", file);
  return api.request(`/weddings/${encodeURIComponent(id)}/media`, { method: "POST", body, schema: uploadedMediaSchema });
};
export function mediaUrl(value: string | null | undefined) {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value)) return value;
  const base = env.apiUrl;
  return base ? new URL(value, base).toString() : value;
}
