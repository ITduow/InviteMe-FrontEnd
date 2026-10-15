import { z } from "zod";

const count = z.number().int().nonnegative();
export const participantSchema = z.object({
  id: z.string(),
  guestId: z.string(),
  fullName: z.string(),
  type: z.string(),
  attendanceStatus: z.string(),
});
export const guestSchema = z.object({
  id: z.string(),
  guestCode: z.string(),
  fullName: z.string(),
  groupId: z.string().nullable(),
  side: z.string().nullable(),
  recordStatus: z.string(),
  hasEmail: z.boolean(),
  hasPhone: z.boolean(),
  invitationId: z.string().nullable(),
  invitationStatus: z.string().nullable(),
});
const page = {
  totalCount: count,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
};
export const guestPageSchema = z.object({ ...page, items: z.array(guestSchema) });
export const participantPageSchema = z.object({ ...page, items: z.array(participantSchema) });
export const reportSchema = z.object({
  estimatedHeadcount: count,
  confirmedHeadcount: count,
  waitlistedHeadcount: count,
  pendingHeadcount: count,
  declinedHeadcount: count,
  seatedHeadcount: count,
});
const option = z.object({ code: z.string(), label: z.string() });
export const optionsSchema = z.object({
  sides: z.array(option),
  relationships: z.array(option),
  participantRoles: z.array(option).nullish(),
});
const rowSchema = z.object({
  rowNumber: z.number().int(),
  fullName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  side: z.string().nullable(),
  relationship: z.string().nullable(),
  groupName: z.string().nullable(),
  maxPlusOne: count,
  expectedCompanionCount: count,
  notes: z.string().nullable(),
  invitationGroupCode: z.string().nullish(),
  participantType: z.string().default("PRIMARY"),
  groupKey: z.string().nullish(),
  rawValues: z.record(z.string(), z.string()).nullish(),
});
const issueSchema = z.object({
  rowNumber: z.number().int(),
  column: z.string(),
  code: z.string(),
  message: z.string(),
});
export const previewSchema = z.object({
  importId: z.string(),
  expiresAt: z.iso.datetime({ offset: true }),
  rows: z.array(rowSchema),
  errors: z.array(issueSchema),
  warnings: z.array(issueSchema),
  formatVersion: z.number().int().default(1),
  groups: z
    .array(
      z.object({
        groupKey: z.string(),
        code: z.string().nullable(),
        members: z.array(rowSchema),
        namedPersonCount: count,
        additionalAllowance: count,
        maximumPartySize: count,
      }),
    )
    .nullish(),
});
export const resultSchema = z.object({
  importId: z.string(),
  importedCount: count,
  guestIds: z.array(z.string()),
  importedParticipantCount: count.optional(),
  guests: z
    .array(
      z.object({
        id: z.string(),
        guestCode: z.string(),
        fullName: z.string(),
        participants: z.array(participantSchema),
      }),
    )
    .nullish(),
});
export type Preview = z.infer<typeof previewSchema>;
export type ImportResult = z.infer<typeof resultSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type Participant = z.infer<typeof participantSchema>;
export const detailSchema = z.object({
  id: z.string(),
  guestCode: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  side: z.string().nullable(),
  relationship: z.string().nullable(),
  groupName: z.string().nullable(),
  notes: z.string().nullable(),
  additionalAllowance: count,
  recordStatus: z.string(),
  participants: z.array(participantSchema),
});
