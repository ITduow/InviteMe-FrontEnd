"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { claimGuestGift, createGuestGift, getGuestGiftPage } from "../api/gifts.api";
import { useLocale } from "@/i18n/language-context";
import { formatCurrency } from "@/i18n/format";

export function GuestGiftPanel({ token }: { token: string }) {
  const { t } = useTranslation("gifts");
  const { language } = useLocale();
  const { api } = useRuntime();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(200_000);
  const [accountId, setAccountId] = useState("");
  const [message, setMessage] = useState("");
  const [messagePublic, setMessagePublic] = useState(true);
  const [error, setError] = useState("");
  const queryKey = ["guest-gifts", token];
  const page = useQuery({
    queryKey,
    queryFn: ({ signal }) => getGuestGiftPage(api, token, signal),
    refetchInterval: 10_000,
  });
  const create = useMutation({
    mutationFn: () =>
      createGuestGift(
        api,
        token,
        {
          amount,
          message: message.trim() || undefined,
          accountId: accountId || undefined,
          messagePublic,
        },
        crypto.randomUUID(),
      ),
    onSuccess: async () => {
      setError("");
      setMessage("");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: () => setError(t("createError")),
  });
  const claim = useMutation({
    mutationFn: (id: string) => claimGuestGift(api, token, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: () => setError(t("claimError")),
  });

  if (page.isPending) return <p role="status">{t("loadingAccounts")}</p>;
  if (page.isError)
    return (
      <p role="alert" className="text-sm text-red-700">
        {t("loadFailed")}
      </p>
    );
  const data = page.data;
  return (
    <div className="space-y-4 text-left">
      <p className="text-sm text-muted-foreground">{t("intro", { wedding: data.weddingTitle })}</p>
      {data.accounts.length === 0 ? (
        <p className="rounded-lg bg-muted p-3 text-sm">{t("noAccounts")}</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            create.mutate();
          }}
        >
          <label className="block text-sm font-medium">
            {t("amount")}
            <div className="mt-2 flex flex-wrap gap-2">
              {data.suggestedAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  aria-pressed={amount === value}
                  className={`rounded-full border px-3 py-1.5 text-sm ${amount === value ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
                >
                  {formatCurrency(value, language)}
                </button>
              ))}
            </div>
            <input
              className="mt-2 w-full rounded-md border bg-background px-3 py-2"
              type="number"
              min={data.minAmount}
              max={data.maxAmount}
              step={10_000}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              required
            />
          </label>
          {data.accounts.length > 1 && (
            <label className="block text-sm font-medium">
              {t("recipientAccount")}
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                required
              >
                <option value="">{t("chooseAccount")}</option>
                {data.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label || account.bankName} · {account.accountName} ·{" "}
                    {account.accountNumber}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm font-medium">
            {t("wish")}
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2"
              maxLength={500}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("wishPlaceholder")}
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={messagePublic}
              onChange={(event) => setMessagePublic(event.target.checked)}
            />
            <span>{t("showWish")}</span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t("creating") : t("createQr")}
          </Button>
        </form>
      )}
      {data.myGifts.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">{t("myTransfers")}</h3>
          {data.myGifts.map((gift) => (
            <article key={gift.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{formatCurrency(gift.amount ?? 0, language)}</strong>
                <span className="rounded-full bg-muted px-2 py-1 text-xs">
                  {gift.status === "PENDING"
                    ? t("pending")
                    : gift.status === "CLAIMED"
                      ? t("claimed")
                      : gift.status === "PAID"
                        ? t("paid")
                        : gift.status}
                </span>
              </div>
              {gift.account && (
                <p className="mt-2 text-sm">
                  {gift.account.bankName} · {gift.account.accountName} ·{" "}
                  {gift.account.accountNumber}
                </p>
              )}
              {gift.transferContent && (
                <p className="mt-1 break-all text-sm">
                  {t("transferContent")}
                  <strong>{gift.transferContent}</strong>
                </p>
              )}
              {gift.qrImageUrl && (
                <Image
                  src={gift.qrImageUrl}
                  alt={t("giftQrAlt")}
                  width={220}
                  height={220}
                  unoptimized
                  className="mx-auto mt-3 rounded-lg border bg-white p-2"
                />
              )}
              {gift.notice && <p className="mt-2 text-xs text-muted-foreground">{gift.notice}</p>}
              {gift.status === "PENDING" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={claim.isPending}
                  onClick={() => claim.mutate(gift.id)}
                >
                  {t("markTransferred")}
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
