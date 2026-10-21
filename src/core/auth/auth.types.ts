import { z } from "zod";

export const PLATFORM_ROLES = ["ADMIN", "USER"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export const WEDDING_PERMISSIONS = [
  "WEDDING_VIEW",
  "WEDDING_EDIT",
  "GUEST_VIEW",
  "GUEST_EDIT",
  "INVITATION_SEND",
  "RSVP_VIEW",
  "SEATING_VIEW",
  "SEATING_EDIT",
  "CHECKIN_MANAGE",
  "GIFT_VIEW",
  "GIFT_EDIT",
  "ANALYTICS_VIEW",
] as const;
export type WeddingPermission = (typeof WEDDING_PERMISSIONS)[number];
export const weddingAccessSchema = z.object({
  weddingId: z.string(),
  isOwner: z.boolean().optional(),
  permissions: z.array(z.enum(WEDDING_PERMISSIONS)),
});
export type WeddingAccess = z.infer<typeof weddingAccessSchema>;
