"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { Button } from "@/shared/ui/button";
import { claimGuestGift, createGuestGift, getGuestGiftPage } from "../api/gifts.api";

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "₫";
}

export function GuestGiftPanel({ token }: { token: string }) {
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
    onError: () => setError("Không tạo được mã quà mừng. Kiểm tra tài khoản nhận và thử lại."),
  });
  const claim = useMutation({
    mutationFn: (id: string) => claimGuestGift(api, token, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: () => setError("Không cập nhật được trạng thái chuyển khoản. Vui lòng thử lại."),
  });

  if (page.isPending) return <p role="status">Đang tải thông tin tài khoản nhận quà…</p>;
  if (page.isError)
    return (
      <p role="alert" className="text-sm text-red-700">
        Chưa tải được thông tin quà mừng. Vui lòng thử lại sau.
      </p>
    );
  const data = page.data;
  return (
    <div className="space-y-4 text-left">
      <p className="text-sm text-muted-foreground">
        Gửi lời chúc và tạo mã VietQR chuyển khoản trực tiếp đến tài khoản của {data.weddingTitle}.
        InviteMe không giữ tiền.
      </p>
      {data.accounts.length === 0 ? (
        <p className="rounded-lg bg-muted p-3 text-sm">
          Cặp đôi chưa thiết lập tài khoản nhận quà.
        </p>
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
            Số tiền
            <div className="mt-2 flex flex-wrap gap-2">
              {data.suggestedAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  aria-pressed={amount === value}
                  className={`rounded-full border px-3 py-1.5 text-sm ${amount === value ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
                >
                  {money(value)}
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
              Tài khoản nhận
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                required
              >
                <option value="">Chọn tài khoản</option>
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
            Lời chúc
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2"
              maxLength={500}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Gửi lời chúc đến cặp đôi"
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={messagePublic}
              onChange={(event) => setMessagePublic(event.target.checked)}
            />
            <span>Cho phép cặp đôi hiển thị lời chúc này trong sổ lời chúc.</span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Đang tạo…" : "Tạo mã VietQR"}
          </Button>
        </form>
      )}
      {data.myGifts.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">Mã chuyển khoản của bạn</h3>
          {data.myGifts.map((gift) => (
            <article key={gift.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{money(gift.amount ?? 0)}</strong>
                <span className="rounded-full bg-muted px-2 py-1 text-xs">
                  {gift.status === "PENDING"
                    ? "Chờ chuyển khoản"
                    : gift.status === "CLAIMED"
                      ? "Đang chờ xác nhận"
                      : gift.status === "PAID"
                        ? "Đã xác nhận"
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
                  Nội dung chuyển khoản: <strong>{gift.transferContent}</strong>
                </p>
              )}
              {gift.qrImageUrl && (
                <Image
                  src={gift.qrImageUrl}
                  alt="Mã VietQR mừng cưới"
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
                  Tôi đã chuyển khoản
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
