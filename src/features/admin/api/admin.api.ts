import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";

const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
  });

export const adminDashboardSchema = z.object({
  totalAccounts: z.number(),
  activeAccounts: z.number(),
  suspendedAccounts: z.number(),
  totalWeddings: z.number(),
  draftWeddings: z.number(),
  publishedWeddings: z.number(),
  closedWeddings: z.number(),
  activeGuests: z.number(),
  invitationsSent: z.number(),
});
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(["ADMIN", "USER"]),
  status: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type AdminUser = z.infer<typeof adminUserSchema>;
export const adminUsersSchema = pageSchema(adminUserSchema);

export const adminWeddingSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  ownerEmail: z.string(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  capacity: z.number().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const adminWeddingsSchema = pageSchema(adminWeddingSchema);

export const adminTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  theme: z.string().nullable(),
  previewUrl: z.string().nullable(),
  configurationJson: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type AdminTemplate = z.infer<typeof adminTemplateSchema>;
export const adminTemplatesSchema = pageSchema(adminTemplateSchema);

export const adminPermissionSchema = z.object({
  code: z.string(),
  name: z.string(),
  scope: z.string(),
  description: z.string().nullable(),
  assignable: z.boolean(),
});
export const adminRoleSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  scope: z.string(),
  permissions: z.array(z.string()),
  assignablePermissions: z.array(z.string()),
});
export const adminAccessControlSchema = z.object({
  roles: z.array(adminRoleSchema),
  permissions: z.array(adminPermissionSchema),
  model: z.string(),
});
export type AdminAccessControl = z.infer<typeof adminAccessControlSchema>;

export const adminAuditLogSchema = z.object({
  id: z.string(),
  weddingId: z.string().nullable(),
  weddingTitle: z.string().nullable(),
  actorType: z.string(),
  actorUserId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  actorName: z.string().nullable(),
  actorGuestId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const adminAuditLogsSchema = pageSchema(adminAuditLogSchema);

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}

export const adminApi = {
  dashboard: (api: ApiClient, signal?: AbortSignal) =>
    api.request("/admin/dashboard", { signal, schema: adminDashboardSchema }),
  users: (
    api: ApiClient,
    input: { page: number; pageSize?: number; search?: string; status?: string; role?: string },
    signal?: AbortSignal,
  ) => api.request(`/admin/users?${queryString(input)}`, { signal, schema: adminUsersSchema }),
  setUserStatus: (api: ApiClient, userId: string, status: "ACTIVE" | "SUSPENDED") =>
    api.request(`/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "PUT",
      body: { status },
      schema: adminUserSchema,
    }),
  setUserRole: (api: ApiClient, userId: string, role: "ADMIN" | "USER") =>
    api.request(`/admin/users/${encodeURIComponent(userId)}/role`, {
      method: "PUT",
      body: { role },
      schema: adminUserSchema,
    }),
  weddings: (
    api: ApiClient,
    input: { page: number; pageSize?: number; search?: string; status?: string },
    signal?: AbortSignal,
  ) =>
    api.request(`/admin/weddings?${queryString(input)}`, { signal, schema: adminWeddingsSchema }),
  templates: (
    api: ApiClient,
    input: { page: number; pageSize?: number; search?: string; status?: string },
    signal?: AbortSignal,
  ) =>
    api.request(`/admin/templates?${queryString(input)}`, { signal, schema: adminTemplatesSchema }),
  createTemplate: (
    api: ApiClient,
    input: {
      name: string;
      slug: string;
      theme?: string | null;
      previewUrl?: string | null;
      configurationJson?: string | null;
      status: string;
    },
  ) =>
    api.request("/admin/templates", { method: "POST", body: input, schema: adminTemplateSchema }),
  updateTemplate: (
    api: ApiClient,
    id: string,
    input: {
      name: string;
      slug: string;
      theme?: string | null;
      previewUrl?: string | null;
      configurationJson?: string | null;
      status: string;
    },
  ) =>
    api.request(`/admin/templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: input,
      schema: adminTemplateSchema,
    }),
  setTemplateStatus: (api: ApiClient, id: string, status: string) =>
    api.request(`/admin/templates/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { status },
      schema: adminTemplateSchema,
    }),
  accessControl: (api: ApiClient, signal?: AbortSignal) =>
    api.request("/admin/access-control", { signal, schema: adminAccessControlSchema }),
  updateRolePermissions: (api: ApiClient, role: string, permissions: string[]) =>
    api.request(`/admin/roles/${encodeURIComponent(role)}/permissions`, {
      method: "PUT",
      body: { permissions },
      schema: adminAccessControlSchema,
    }),
  auditLogs: (
    api: ApiClient,
    input: {
      page: number;
      pageSize?: number;
      action?: string;
      entityType?: string;
      from?: string;
      to?: string;
    },
    signal?: AbortSignal,
  ) =>
    api.request(`/admin/audit-logs?${queryString(input)}`, {
      signal,
      schema: adminAuditLogsSchema,
    }),
};
