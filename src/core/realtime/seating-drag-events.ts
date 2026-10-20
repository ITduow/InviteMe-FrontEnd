import { z } from "zod";

const presenceFields = {
  userId: z.string(),
  connectionId: z.string(),
  displayName: z.string(),
  placeIds: z.array(z.string()),
  expiresAt: z.string().datetime({ offset: true }),
  tableId: z.string().nullable(),
  seatNumber: z.number().int().nullable(),
};
export const seatingDragLeaseSchema = z.object({
  ...presenceFields,
  token: z.string(),
  weddingId: z.string(),
});
export const seatingDragSnapshotSchema = z.object({
  weddingId: z.string(),
  revision: z.number().int().nonnegative(),
  leases: z.array(z.object(presenceFields)),
});
export type SeatingDragLease = z.infer<typeof seatingDragLeaseSchema>;
export type SeatingDragSnapshot = z.infer<typeof seatingDragSnapshotSchema>;
export type SeatingDragPresence = SeatingDragSnapshot["leases"][number];
