import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";
import { guestRsvpInputSchema, rsvpRequestSchema, rsvpSchema } from "./rsvp.api";

const count = z.number().int().nonnegative();
const sideSchema = z.enum(["BRIDE", "GROOM", "MUTUAL", "UNSPECIFIED"]);
export const rsvpListStatusSchema = z.enum([
  "NOT_RESPONDED",
  "ATTENDING",
  "DECLINED",
  "WAITING",
  "PENDING_REQUEST",
]);
const page = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: count,
    pageSize: count,
    totalCount: count,
  });

export const rsvpSettingsSchema = z.object({
  weddingId: z.string(),
  plusOneLimit: count,
  version: count,
  rsvpDeadline: z.string().nullable(),
});
export const rsvpDashboardSchema = z.object({
  weddingId: z.string(),
  generatedAt: z.string(),
  rsvpDeadline: z.string().nullable(),
  capacity: z.object({ max: count.nullable(), occupied: count, remaining: count.nullable() }),
  invitations: z.object({
    invited: count,
    responded: count,
    notResponded: count,
    attending: count,
    declined: count,
    waiting: count,
    responseRate: z.number().nonnegative(),
  }),
  people: z.object({
    invitedPlaces: count,
    confirmed: count,
    companions: count,
    waitlisted: count,
    declined: count,
    unusedPlaces: count,
    pendingPlaces: count,
  }),
  pendingRequests: count,
  lockedGuests: count,
  notes: z.object({
    confirmedWithDietaryNote: count,
    guestsWithNote: count,
    topDietaryNotes: z.array(z.object({ note: z.string(), count })),
  }),
  bySide: z.array(
    z.object({ side: sideSchema, invited: count, responded: count, confirmed: count }),
  ),
});
export const rsvpGuestRowSchema = z.object({
  guestId: z.string(),
  recipientName: z.string(),
  side: sideSchema,
  groupId: z.string().nullable(),
  groupName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  rsvpStatus: rsvpListStatusSchema,
  invitedPlaces: count,
  confirmedPeople: count,
  waitlistedPeople: count,
  locked: z.boolean(),
  pendingRequest: z.boolean(),
  note: z.string().nullable(),
  respondedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export const waitlistEntrySchema = z.object({
  id: z.string(),
  guestId: z.string(),
  requestedSlots: count,
  status: z.string(),
  kind: z.enum(["FULL_PARTY", "ADDITIONAL_MEMBER"]),
  requestedAt: z.string(),
});

export type RsvpDashboard = z.infer<typeof rsvpDashboardSchema>;
export type RsvpGuestRow = z.infer<typeof rsvpGuestRowSchema>;
export type RsvpListStatus = z.infer<typeof rsvpListStatusSchema>;
export type RsvpSettings = z.infer<typeof rsvpSettingsSchema>;
export type RsvpWaitlistEntry = z.infer<typeof waitlistEntrySchema>;
export type RsvpGuestFilters = {
  side?: string;
  groupId?: string;
  status?: RsvpListStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

const base = (weddingId: string) => `/weddings/${encodeURIComponent(weddingId)}`;
const rsvps = (weddingId: string) => `${base(weddingId)}/rsvps`;
const params = (values: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") query.set(key, String(value));
  return query.size ? `?${query}` : "";
};
export const hostRsvpKeys = {
  all: (weddingId: string) => ["host-rsvp", weddingId] as const,
  dashboard: (weddingId: string, side?: string, groupId?: string) =>
    ["host-rsvp", weddingId, "dashboard", side, groupId] as const,
  guests: (weddingId: string, filters: RsvpGuestFilters) =>
    ["host-rsvp", weddingId, "guests", filters] as const,
  detail: (weddingId: string, guestId: string) =>
    ["host-rsvp", weddingId, "detail", guestId] as const,
  settings: (weddingId: string) => ["host-rsvp", weddingId, "settings"] as const,
  requests: (weddingId: string, status: string, pageNumber: number) =>
    ["host-rsvp", weddingId, "requests", status, pageNumber] as const,
  waitlist: (weddingId: string, pageNumber: number) =>
    ["host-rsvp", weddingId, "waitlist", pageNumber] as const,
};

export function getRsvpDashboard(
  api: ApiClient,
  weddingId: string,
  side?: string,
  groupId?: string,
  signal?: AbortSignal,
) {
  return api.request(`${rsvps(weddingId)}/dashboard${params({ side, groupId })}`, {
    signal,
    schema: rsvpDashboardSchema,
  });
}
export function listRsvpGuests(
  api: ApiClient,
  weddingId: string,
  filters: RsvpGuestFilters,
  signal?: AbortSignal,
) {
  return api.request(`${rsvps(weddingId)}/dashboard/guests${params(filters)}`, {
    signal,
    schema: page(rsvpGuestRowSchema),
  });
}
export function exportRsvpGuests(
  api: ApiClient,
  weddingId: string,
  filters: Omit<RsvpGuestFilters, "page" | "pageSize">,
) {
  return api.download(`${rsvps(weddingId)}/dashboard/export${params(filters)}`);
}
export function getHostRsvp(
  api: ApiClient,
  weddingId: string,
  guestId: string,
  signal?: AbortSignal,
) {
  return api.request(`${rsvps(weddingId)}/${encodeURIComponent(guestId)}`, {
    signal,
    schema: rsvpSchema,
  });
}
export function saveHostRsvp(
  api: ApiClient,
  weddingId: string,
  guestId: string,
  input: z.infer<typeof guestRsvpInputSchema> & {
    source: "PHONE" | "CHAT" | "IN_PERSON" | "OTHER";
  },
) {
  return api.request(`${rsvps(weddingId)}/${encodeURIComponent(guestId)}`, {
    method: "PUT",
    body: input,
    schema: rsvpSchema,
  });
}
export function getRsvpSettings(api: ApiClient, weddingId: string, signal?: AbortSignal) {
  return api.request(`${base(weddingId)}/rsvp-settings`, { signal, schema: rsvpSettingsSchema });
}
export function saveRsvpSettings(
  api: ApiClient,
  weddingId: string,
  expectedVersion: number,
  plusOneLimit: number,
) {
  return api.request(`${base(weddingId)}/rsvp-settings`, {
    method: "PUT",
    body: { expectedVersion, plusOneLimit },
    schema: rsvpSettingsSchema,
  });
}
export function lockRsvps(
  api: ApiClient,
  weddingId: string,
  locked: boolean,
  guestIds?: string[],
  groupId?: string,
) {
  return api.request(`${rsvps(weddingId)}/locks`, {
    method: "PUT",
    body: { locked, guestIds, groupId },
    schema: z.object({ affected: count, locked: z.boolean() }),
  });
}
export function listRsvpRequests(
  api: ApiClient,
  weddingId: string,
  status = "PENDING",
  pageNumber = 1,
  signal?: AbortSignal,
) {
  return api.request(
    `${rsvps(weddingId)}/requests${params({ status, page: pageNumber, pageSize: 25 })}`,
    { signal, schema: page(rsvpRequestSchema) },
  );
}
export function resolveRsvpRequest(
  api: ApiClient,
  weddingId: string,
  requestId: string,
  decision: "approve" | "reject",
) {
  return api.request(`${rsvps(weddingId)}/requests/${encodeURIComponent(requestId)}/${decision}`, {
    method: "POST",
    schema: rsvpSchema,
  });
}
export function listRsvpWaitlist(
  api: ApiClient,
  weddingId: string,
  pageNumber = 1,
  signal?: AbortSignal,
) {
  return api.request(`${rsvps(weddingId)}/waitlist${params({ page: pageNumber, pageSize: 25 })}`, {
    signal,
    schema: page(waitlistEntrySchema),
  });
}
export function resolveRsvpWaitlist(
  api: ApiClient,
  weddingId: string,
  entryId: string,
  decision: "promote" | "decline",
) {
  return api.request(`${rsvps(weddingId)}/waitlist/${encodeURIComponent(entryId)}/${decision}`, {
    method: "POST",
    schema: rsvpSchema,
  });
}
