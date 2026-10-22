import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";
import type { CoupleRow } from "../utils/couple-import";

const group = z.object({ id: z.string(), name: z.string() });
export const planningGuestSchema = z.object({
  id: z.string(),
  version: z.number(),
  recipientName: z.string(),
  honorific: z.string().nullable(),
  invitationKind: z.enum(["INDIVIDUAL", "FAMILY", "GROUP"]),
  expectedPeople: z.number(),
  side: z.enum(["BRIDE", "GROOM", "MUTUAL", "UNSPECIFIED"]),
  group: group.nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable().optional(),
  archivedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  possibleDuplicate: z.boolean().optional(),
  note: z.string().nullable(),
  invitationPath: z
    .string()
    .regex(/^\/invite\/[a-f0-9]{64}$/)
    .nullable()
    .optional(),
});
export const planningDetailSchema = planningGuestSchema.extend({
  places: z.array(
    z.object({
      id: z.string(),
      person: z
        .object({
          id: z.string(),
          fullName: z.string(),
          role: z.string(),
          attendanceStatus: z.string(),
        })
        .nullable(),
    }),
  ),
});
const issue = z.object({
  rowNumber: z.number(),
  field: z.string(),
  code: z.string(),
  message: z.string(),
});
const result = z.object({
  importId: z.string(),
  createdGuestCount: z.number(),
  createdPlaceCount: z.number(),
  items: z.array(
    z.object({ rowNumber: z.number(), guestId: z.string(), expectedPeople: z.number() }),
  ),
  createdGroups: z.array(group),
  warnings: z.array(issue),
});
export type PlanningGuest = z.infer<typeof planningGuestSchema>;
export type PlanningDetail = z.infer<typeof planningDetailSchema>;
const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine(
    (value) =>
      value.length === 0 ||
      (/^\+?[0-9][0-9 ().-]*$/.test(value) &&
        value.replace(/[^0-9]/g, "").length >= 7 &&
        value.replace(/[^0-9]/g, "").length <= 15),
    "Số điện thoại cần có 7–15 chữ số; có thể dùng dấu +, khoảng trắng, dấu chấm, gạch nối hoặc ngoặc.",
  )
  .nullable();
export const planningGuestUpdateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  recipientName: z.string().trim().min(1).max(150),
  honorific: z.string().trim().max(50).nullable(),
  side: z.enum(["BRIDE", "GROOM", "MUTUAL", "UNSPECIFIED"]),
  groupId: z.string().nullable(),
  phone: phoneSchema,
  note: z.string().trim().max(2000).nullable(),
  email: z.union([z.email(), z.literal("")]).nullable(),
});
export type PlanningGuestUpdate = z.infer<typeof planningGuestUpdateSchema>;
export const planningGuestCreateSchema = z.object({
  recipientName: z.string().trim().min(1).max(150),
  honorific: z.string().trim().max(50).nullable(),
  invitationKind: z.enum(["INDIVIDUAL", "FAMILY", "GROUP"]),
  expectedPeople: z.number().int().min(1).max(500),
  side: z.enum(["BRIDE", "GROOM", "MUTUAL", "UNSPECIFIED"]),
  groupId: z.string().nullable(),
  phone: phoneSchema,
  note: z.string().trim().max(2000).nullable(),
  email: z.union([z.email(), z.literal("")]).nullable(),
});
export type PlanningGuestCreate = z.infer<typeof planningGuestCreateSchema>;
export const sideLabels = {
  BRIDE: "Nhà gái",
  GROOM: "Nhà trai",
  MUTUAL: "Chung",
  UNSPECIFIED: "Chưa xác định",
};
export function importBody(rows: CoupleRow[]) {
  return {
    rows: rows.map((r) => ({
      rowNumber: r.line,
      recipientName: r.values[0],
      honorific: r.values[1] || null,
      invitationKind:
        (
          { "Cá nhân": "INDIVIDUAL", "Gia đình": "FAMILY", Nhóm: "GROUP" } as Record<string, string>
        )[r.values[2] ?? ""] ?? "INDIVIDUAL",
      expectedPeople: r.expected,
      side:
        ({ "Nhà gái": "BRIDE", "Nhà trai": "GROOM", Chung: "MUTUAL" } as Record<string, string>)[
          r.values[4] ?? ""
        ] ?? "UNSPECIFIED",
      group: r.values[5] ? { newName: r.values[5], confirmed: true } : null,
      phone: r.values[6] || null,
      email: r.values[8] || null,
      note: r.values[7] || null,
    })),
  };
}
const path = (id: string) => `/weddings/${encodeURIComponent(id)}/guest-planning`;
export function importGuests(
  api: ApiClient,
  id: string,
  body: ReturnType<typeof importBody>,
  key: string,
) {
  return api.request(`${path(id)}/imports`, {
    method: "POST",
    body,
    headers: { "Idempotency-Key": key },
    schema: result,
  });
}
export function listPlanningGuests(
  api: ApiClient,
  id: string,
  page: number,
  search: string,
  signal?: AbortSignal,
  archivedOnly = false,
  filters: { side?: string; groupId?: string } = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    search,
    archivedOnly: String(archivedOnly),
  });
  if (filters.side) params.set("side", filters.side);
  if (filters.groupId) params.set("groupId", filters.groupId);
  return api.request(`${path(id)}/guests?${params}`, {
    signal,
    schema: z.object({
      items: z.array(planningGuestSchema),
      page: z.number(),
      pageSize: z.number(),
      totalItems: z.number(),
    }),
  });
}
export function getPlanningGuest(
  api: ApiClient,
  id: string,
  guestId: string,
  signal?: AbortSignal,
  includeArchived = false,
) {
  return api.request(
    `${path(id)}/guests/${encodeURIComponent(guestId)}${includeArchived ? "?includeArchived=true" : ""}`,
    {
      signal,
      schema: planningDetailSchema,
    },
  );
}

export function updatePlanningGuest(
  api: ApiClient,
  id: string,
  guestId: string,
  input: PlanningGuestUpdate,
) {
  return api.request(`${path(id)}/guests/${encodeURIComponent(guestId)}`, {
    method: "PUT",
    body: planningGuestUpdateSchema.parse(input),
    schema: planningGuestSchema,
  });
}

export function createPlanningGuest(
  api: ApiClient,
  id: string,
  input: PlanningGuestCreate,
  key: string,
) {
  return api.request(`${path(id)}/guests`, {
    method: "POST",
    body: planningGuestCreateSchema.parse(input),
    headers: { "Idempotency-Key": key },
    schema: planningGuestSchema,
  });
}

export function archivePlanningGuest(
  api: ApiClient,
  id: string,
  guestId: string,
  expectedVersion: number,
) {
  return api.request(
    `${path(id)}/guests/${encodeURIComponent(guestId)}?${new URLSearchParams({ expectedVersion: String(expectedVersion) })}`,
    {
      method: "DELETE",
      schema: z.object({ id: z.string(), version: z.number(), archivedAt: z.string() }),
    },
  );
}

export async function listPlanningGroups(api: ApiClient, id: string, signal?: AbortSignal) {
  return api.request(`${path(id)}/groups`, {
    signal,
    schema: z.object({ isWeddingWide: z.boolean(), items: z.array(group) }),
  });
}

export function restorePlanningGuest(
  api: ApiClient,
  id: string,
  guestId: string,
  expectedVersion: number,
) {
  return api.request(
    `${path(id)}/guests/${encodeURIComponent(guestId)}/restore?${new URLSearchParams({ expectedVersion: String(expectedVersion) })}`,
    {
      method: "POST",
      schema: planningGuestSchema,
    },
  );
}
