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
  note: z.string().nullable(),
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
) {
  return api.request(
    `${path(id)}/guests?${new URLSearchParams({ page: String(page), pageSize: "20", search })}`,
    {
      signal,
      schema: z.object({
        items: z.array(planningGuestSchema),
        page: z.number(),
        pageSize: z.number(),
        totalItems: z.number(),
      }),
    },
  );
}
export function getPlanningGuest(
  api: ApiClient,
  id: string,
  guestId: string,
  signal?: AbortSignal,
) {
  return api.request(`${path(id)}/guests/${encodeURIComponent(guestId)}`, {
    signal,
    schema: planningDetailSchema,
  });
}
