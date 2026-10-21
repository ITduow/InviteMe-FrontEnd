import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";

export const seatLookupSchema = z.object({
  guestId: z.string(),
  recipientName: z.string(),
  honorific: z.string().nullable(),
  published: z.boolean(),
  seats: z.array(
    z.object({
      position: z.number().int().positive(),
      personName: z.string().nullable(),
      status: z.enum(["PENDING", "USED", "UNUSED"]),
      table: z.string().nullable(),
      seatNumber: z.number().int().nullable(),
      placeId: z.string(),
      participantId: z.string().nullable(),
      checkedInAt: z.string().nullable(),
      checkInKind: z.enum(["INVITED", "WALK_IN"]).nullable(),
    }),
  ),
});
export type SeatLookup = z.infer<typeof seatLookupSchema>;

const checkInPlaceResultSchema = z.object({
  placeId: z.string(),
  position: z.number().int().positive(),
  personName: z.string().nullable(),
  status: z.enum(["PENDING", "USED", "UNUSED"]),
  table: z.string().nullable(),
  seatNumber: z.number().int().nullable(),
  result: z.enum(["CHECKED_IN", "ALREADY_CHECKED_IN"]),
  checkedInAt: z.string(),
  kind: z.enum(["INVITED", "WALK_IN"]),
});
export const checkInResultSchema = z.object({
  guestId: z.string(),
  recipientName: z.string(),
  honorific: z.string().nullable(),
  places: z.array(checkInPlaceResultSchema),
});
export type CheckInResult = z.infer<typeof checkInResultSchema>;

export function lookupGuestSeats(api: ApiClient, weddingId: string, code: string) {
  const query = new URLSearchParams({ code: code.trim() });
  return api.request(
    `/weddings/${encodeURIComponent(weddingId)}/guest-planning/seat-lookup?${query}`,
    { schema: seatLookupSchema },
  );
}

export function checkInGuestPlaces(
  api: ApiClient,
  weddingId: string,
  code: string,
  placeIds: string[],
  exceptionReason?: string,
) {
  return api.request(
    `/weddings/${encodeURIComponent(weddingId)}/guest-planning/check-ins`,
    {
      method: "POST",
      body: {
        code: code.trim(),
        guestId: null,
        placeIds,
        ...(exceptionReason ? { exceptionReason } : {}),
      },
      schema: checkInResultSchema,
    },
  );
}
