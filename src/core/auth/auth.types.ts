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
export const currentUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.email(),
  role: z.enum(PLATFORM_ROLES),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;
export const tokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().positive(),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export const weddingAccessSchema = z.object({
  weddingId: z.string(),
  permissions: z.array(z.enum(WEDDING_PERMISSIONS)),
});
export type WeddingAccess = z.infer<typeof weddingAccessSchema>;
