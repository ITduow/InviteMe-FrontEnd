import { z } from "zod";

// Proposed event names. Align with the ASP.NET hub before integration.
export const REALTIME_EVENTS = {
  rsvp: "RsvpUpdated",
  capacity: "CapacityUpdated",
  waitlist: "WaitlistUpdated",
  seating: "SeatingUpdated",
  table: "TableCapacityUpdated",
  checkIn: "CheckInUpdated",
} as const;
export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
export const weddingEventSchema = z.object({
  weddingId: z.string(),
  version: z.number().int().nonnegative(),
});
export type WeddingEvent = z.infer<typeof weddingEventSchema>;
