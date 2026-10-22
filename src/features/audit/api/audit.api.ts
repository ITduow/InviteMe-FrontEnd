import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";

export const auditLogSchema = z.object({
  id: z.string(),
  actorType: z.string(),
  actorUserId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  actorName: z.string().nullable(),
  actorGuestId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  metadata: z.unknown().nullable().optional(),
  createdAt: z.iso.datetime({ offset: true }),
});

export const auditLogPageSchema = z.object({
  items: z.array(auditLogSchema),
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditLogFilters = {
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
};

export function listWeddingAuditLogs(
  api: ApiClient,
  weddingId: string,
  page: number,
  filters: AuditLogFilters,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  for (const key of ["action", "entityType", "from", "to"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  return api.request(`/weddings/${encodeURIComponent(weddingId)}/audit-logs?${params}`, {
    signal,
    schema: auditLogPageSchema,
  });
}
