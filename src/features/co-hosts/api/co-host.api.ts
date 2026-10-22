import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";

const planningGroupsSchema = z.object({
  isWeddingWide: z.boolean(),
  items: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const CO_HOST_PERMISSIONS = [
  "GUEST_VIEW",
  "GUEST_EDIT",
  "RSVP_VIEW",
  "SEATING_VIEW",
  "SEATING_EDIT",
  "CHECKIN_MANAGE",
] as const;

export const coHostPermissionSchema = z.enum(CO_HOST_PERMISSIONS);
export type CoHostPermission = z.infer<typeof coHostPermissionSchema>;

export const permissionScopeSchema = z.object({
  permission: coHostPermissionSchema,
  weddingWide: z.boolean(),
  groupIds: z.array(z.string()),
});
export type PermissionScope = z.infer<typeof permissionScopeSchema>;

const coHostSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string(),
  fullName: z.string(),
  status: z.string(),
  permissions: z.array(z.string()),
  joinedAt: z.string().nullable(),
  createdAt: z.string(),
  scopes: z.array(permissionScopeSchema).nullable().optional(),
});
export type CoHost = z.infer<typeof coHostSchema>;

const invitationSchema = z.object({
  id: z.string(),
  weddingId: z.string(),
  email: z.string(),
  status: z.string(),
  expiresAt: z.string(),
  weddingTitle: z.string(),
  grants: z.array(permissionScopeSchema),
});
export type CoHostInvitation = z.infer<typeof invitationSchema>;

const createdInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.string(),
  expiresAt: z.string(),
});

const invitationPreviewSchema = invitationSchema;
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>;

const path = (weddingId: string) => `/weddings/${encodeURIComponent(weddingId)}`;
const invitationPath = (weddingId: string) => `${path(weddingId)}/co-host-invitations`;

export const coHostKeys = {
  root: (weddingId: string) => ["co-hosts", weddingId] as const,
  members: (weddingId: string) => ["co-hosts", weddingId, "members"] as const,
  invitations: (weddingId: string) => ["co-hosts", weddingId, "invitations"] as const,
  groups: (weddingId: string) => ["co-hosts", weddingId, "groups"] as const,
};

export const listCoHosts = (api: ApiClient, weddingId: string, signal?: AbortSignal) =>
  api.request(`${path(weddingId)}/co-hosts`, {
    signal,
    schema: z.array(coHostSchema),
  });

export const listCoHostInvitations = (api: ApiClient, weddingId: string, signal?: AbortSignal) =>
  api.request(invitationPath(weddingId), {
    signal,
    schema: z.array(invitationSchema),
  });

export async function listPlanningGroups(api: ApiClient, weddingId: string, signal?: AbortSignal) {
  const result = await api.request(`${path(weddingId)}/guest-planning/groups`, {
    signal,
    schema: planningGroupsSchema,
  });
  return result.items.sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export const createCoHostInvitation = (
  api: ApiClient,
  weddingId: string,
  email: string,
  grants: PermissionScope[],
) =>
  api.request(invitationPath(weddingId), {
    method: "POST",
    body: { email, grants },
    schema: createdInvitationSchema,
  });

export const revokeCoHostInvitation = (api: ApiClient, weddingId: string, invitationId: string) =>
  api.request(`${invitationPath(weddingId)}/${encodeURIComponent(invitationId)}`, {
    method: "DELETE",
    schema: z.undefined(),
  });

export const updateCoHostScopes = (
  api: ApiClient,
  weddingId: string,
  userId: string,
  grants: PermissionScope[],
) =>
  api.request(`${path(weddingId)}/co-hosts/${encodeURIComponent(userId)}/scopes`, {
    method: "PUT",
    body: { grants },
    schema: coHostSchema,
  });

export const revokeCoHost = (api: ApiClient, weddingId: string, userId: string) =>
  api.request(`${path(weddingId)}/co-hosts/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    schema: z.undefined(),
  });

export const previewCoHostInvitation = (api: ApiClient, token: string) =>
  api.request("/co-host-invitations/preview", {
    method: "POST",
    body: { token },
    schema: invitationPreviewSchema,
  });

export const acceptCoHostInvitation = (api: ApiClient, token: string) =>
  api.request("/co-host-invitations/accept", {
    method: "POST",
    body: { token },
    schema: z.undefined(),
  });
