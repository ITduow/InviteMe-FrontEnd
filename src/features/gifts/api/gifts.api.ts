import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";

const bank = z.object({
  id: z.string(),
  bankBin: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  label: z.string().nullable(),
});
const guestGift = z.object({
  id: z.string(),
  code: z.string().nullable(),
  amount: z.number().nullable(),
  status: z.string(),
  message: z.string().nullable(),
  messagePublic: z.boolean(),
  account: bank.nullable(),
  qrImageUrl: z.string().nullable(),
  transferContent: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string(),
  paidAt: z.string().nullable(),
  notice: z.string().nullable(),
});
export const guestGiftPageSchema = z.object({
  recipientName: z.string(),
  weddingTitle: z.string(),
  accounts: z.array(bank),
  suggestedAmounts: z.array(z.number()),
  minAmount: z.number(),
  maxAmount: z.number(),
  myGifts: z.array(guestGift),
});
export type GuestGiftPage = z.infer<typeof guestGiftPageSchema>;
export type GuestGift = z.infer<typeof guestGift>;
export const giftSummarySchema = z.object({
  totalReceived: z.number(),
  receivedCount: z.number(),
  qrTotal: z.number(),
  qrCount: z.number(),
  cashTotal: z.number(),
  cashCount: z.number(),
  transferTotal: z.number(),
  transferCount: z.number(),
  waiting: z.number(),
  claimed: z.number(),
  expired: z.number(),
  amountMismatches: z.number(),
  needsReview: z.number(),
  accounts: z.number(),
});
export type GiftSummary = z.infer<typeof giftSummarySchema>;
export const giftLedgerSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      guestId: z.string().nullable(),
      giverName: z.string(),
      method: z.string(),
      status: z.string(),
      confirmation: z.string().nullable(),
      code: z.string().nullable(),
      amountExpected: z.number().nullable(),
      amountReceived: z.number().nullable(),
      amountMismatch: z.boolean(),
      message: z.string().nullable(),
      messagePublic: z.boolean(),
      accountId: z.string().nullable(),
      createdAt: z.string(),
      claimedAt: z.string().nullable(),
      paidAt: z.string().nullable(),
    }),
  ),
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
});
export type GiftLedger = z.infer<typeof giftLedgerSchema>;
const host = (id: string) => `/weddings/${encodeURIComponent(id)}/gifts`;
export function getGiftAccounts(api: ApiClient, weddingId: string, signal?: AbortSignal) {
  return api.request(`${host(weddingId)}/accounts`, { signal, schema: z.array(bank) });
}
export function getGiftBanks(api: ApiClient, weddingId: string, signal?: AbortSignal) {
  return api.request(`${host(weddingId)}/banks`, {
    signal,
    schema: z.array(z.object({ bin: z.string(), name: z.string() })),
  });
}
export function addGiftAccount(
  api: ApiClient,
  weddingId: string,
  body: { bankBin: string; accountNumber: string; accountName: string; label?: string },
) {
  return api.request(`${host(weddingId)}/accounts`, { method: "POST", body, schema: bank });
}
export function removeGiftAccount(api: ApiClient, weddingId: string, accountId: string) {
  return api.request(`${host(weddingId)}/accounts/${encodeURIComponent(accountId)}`, {
    method: "DELETE",
    schema: z.undefined(),
  });
}
export function getGiftSummary(api: ApiClient, weddingId: string, signal?: AbortSignal) {
  return api.request(`${host(weddingId)}/summary`, { signal, schema: giftSummarySchema });
}
export function getGiftLedger(
  api: ApiClient,
  weddingId: string,
  page: number,
  search = "",
  signal?: AbortSignal,
) {
  return api.request(
    `${host(weddingId)}?${new URLSearchParams({ page: String(page), pageSize: "25", search })}`,
    { signal, schema: giftLedgerSchema },
  );
}
export function confirmGift(api: ApiClient, weddingId: string, giftId: string) {
  return api.request(`${host(weddingId)}/${encodeURIComponent(giftId)}/confirm`, {
    method: "POST",
    body: {},
    schema: z.unknown(),
  });
}
export function createGuestGift(
  api: ApiClient,
  token: string,
  body: { amount: number; message?: string; accountId?: string; messagePublic: boolean },
  key: string,
) {
  return api.request(`/gifts/${encodeURIComponent(token)}`, {
    method: "POST",
    auth: "none",
    headers: { "Idempotency-Key": key },
    body,
    schema: guestGift,
  });
}
export function getGuestGiftPage(api: ApiClient, token: string, signal?: AbortSignal) {
  return api.request(`/gifts/${encodeURIComponent(token)}`, {
    auth: "none",
    signal,
    schema: guestGiftPageSchema,
  });
}
export function claimGuestGift(api: ApiClient, token: string, id: string) {
  return api.request(`/gifts/${encodeURIComponent(token)}/${encodeURIComponent(id)}/claim`, {
    method: "POST",
    auth: "none",
    schema: guestGift,
  });
}
