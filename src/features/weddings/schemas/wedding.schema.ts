import { z } from "zod";
export const weddingSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  weddingDate: z.iso.date().nullable(),
  participantCount: z.number().int().nonnegative(),
  maxCapacity: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
});
export const weddingListSchema = z.object({
  items: z.array(weddingSummarySchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type WeddingSummary = z.infer<typeof weddingSummarySchema>;
