import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";

export const guestSeatsSchema = z.object({
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
    }),
  ),
});

export function getGuestSeats(api: ApiClient, token: string, signal?: AbortSignal) {
  return api.request(`/guest-invitations/${encodeURIComponent(token)}/seats`, {
    auth: "none",
    signal,
    schema: guestSeatsSchema,
  });
}
