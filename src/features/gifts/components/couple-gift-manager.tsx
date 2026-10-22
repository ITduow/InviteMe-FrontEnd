"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import {
  addGiftAccount,
  confirmGift,
  getGiftAccounts,
  getGiftBanks,
  getGiftLedger,
  getGiftSummary,
  removeGiftAccount,
} from "../api/gifts.api";

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "₫";
}
const fmt = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );

export function CoupleGiftManager({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const queryClient = useQueryClient();
  const { can, isWeddingWide } = usePermission();
  const editable = can("GIFT_EDIT") && isWeddingWide("GIFT_EDIT");
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState("");
  const [bankBin, setBankBin] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const accounts = useQuery({
    queryKey: ["gift-accounts", weddingId],
    queryFn: ({ signal }) => getGiftAccounts(api, weddingId, signal),
  });
  const banks = useQuery({
    queryKey: ["gift-banks", weddingId],
    queryFn: ({ signal }) => getGiftBanks(api, weddingId, signal),
  });
  const summary = useQuery({
    queryKey: ["gift-summary", weddingId],
    queryFn: ({ signal }) => getGiftSummary(api, weddingId, signal),
  });
  const ledger = useQuery({
    queryKey: ["gift-ledger", weddingId, pageNumber, search],
    queryFn: ({ signal }) => getGiftLedger(api, weddingId, pageNumber, search, signal),
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["gift-accounts", weddingId] }),
      queryClient.invalidateQueries({ queryKey: ["gift-summary", weddingId] }),
      queryClient.invalidateQueries({ queryKey: ["gift-ledger", weddingId] }),
    ]);
  };
  const add = useMutation({
    mutationFn: () =>
      addGiftAccount(api, weddingId, {
        bankBin,
        accountNumber,
        accountName,
        label: label || undefined,
      }),
    onSuccess: async () => {
      setError("");
      setAccountNumber("");
      setAccountName("");
      setLabel("");
      await refresh();
    },
    onError: () => setError("Không thêm được tài khoản. Kiểm tra ngân hàng và số tài khoản."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeGiftAccount(api, weddingId, id),
    onSuccess: refresh,
    onError: () => setError("Không thể xóa tài khoản đang được dùng cho giao dịch."),
  });
  const confirm = useMutation({
    mutationFn: (id: string) => confirmGift(api, weddingId, id),
    onSuccess: refresh,
    onError: () => setError("Không xác nhận được giao dịch này."),
  });
  const data = summary.data;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Sổ mừng cưới</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi VietQR, tiền mặt và giao dịch đã xác nhận. InviteMe không giữ tiền; chỉ tính vào
          tổng nhận khi webhook hoặc Couple xác nhận.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {summary.isError && (
        <p role="alert" className="text-sm text-destructive">
          Không tải được tổng quan quà mừng.
        </p>
      )}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Đã nhận", data?.totalReceived],
          ["Giao dịch đã nhận", data?.receivedCount],
          ["Đang chờ", data?.waiting],
          ["Cần đối soát", data?.needsReview],
        ].map(([title, value]) => (
          <article key={String(title)} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-semibold">
              {typeof value === "number" && title === "Đã nhận" ? money(value) : (value ?? "—")}
            </p>
          </article>
        ))}
      </section>
      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <h2 className="font-semibold">Tài khoản nhận VietQR</h2>
          <p className="text-sm text-muted-foreground">Tối đa hai tài khoản cho mỗi đám cưới.</p>
        </div>
        {accounts.data?.map((account) => (
          <div
            key={account.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3 text-sm"
          >
            <span>
              <strong>{account.label || account.bankName}</strong> · {account.accountName} ·{" "}
              {account.accountNumber}
            </span>
            {editable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(account.id)}
              >
                Xóa
              </Button>
            )}
          </div>
        ))}
        {editable && (accounts.data?.length ?? 0) < 2 && (
          <form
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              add.mutate();
            }}
          >
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={bankBin}
              onChange={(event) => setBankBin(event.target.value)}
              required
            >
              <option value="">Chọn ngân hàng</option>
              {banks.data?.map((bank) => (
                <option key={bank.bin} value={bank.bin}>
                  {bank.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Số tài khoản"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              required
              maxLength={30}
            />
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Tên chủ tài khoản"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              required
              maxLength={100}
            />
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Nhãn (nhà trai/gái)"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={30}
            />
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Đang lưu…" : "Thêm tài khoản"}
            </Button>
          </form>
        )}
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Giao dịch</h2>
            <p className="text-sm text-muted-foreground">
              Xác nhận chuyển khoản do khách báo; khoản này mới cập nhật tổng đã nhận.
            </p>
          </div>
          <input
            aria-label="Tìm giao dịch"
            className="rounded-md border bg-background px-3 py-2"
            placeholder="Tìm tên hoặc mã"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPageNumber(1);
            }}
          />
        </div>
        {ledger.isPending ? (
          <p role="status">Đang tải sổ quà…</p>
        ) : ledger.isError ? (
          <p role="alert" className="text-destructive">
            Không tải được danh sách quà.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  {[
                    "Người gửi",
                    "Hình thức",
                    "Trạng thái",
                    "Số tiền",
                    "Lời chúc",
                    "Thời gian",
                    "",
                  ].map((x) => (
                    <th key={x} className="px-3 py-2 font-medium">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.data.items.map((gift) => (
                  <tr key={gift.id} className="border-t">
                    <td className="px-3 py-3">{gift.giverName}</td>
                    <td className="px-3 py-3">{gift.method}</td>
                    <td className="px-3 py-3">
                      {gift.status === "PAID"
                        ? "Đã nhận"
                        : gift.status === "CLAIMED"
                          ? "Khách báo đã chuyển"
                          : gift.status === "PENDING"
                            ? "Chờ chuyển"
                            : gift.status}
                    </td>
                    <td className="px-3 py-3">
                      {money(gift.amountReceived ?? gift.amountExpected ?? 0)}
                      {gift.amountMismatch && <span className="ml-1 text-amber-700">(lệch)</span>}
                    </td>
                    <td className="max-w-56 truncate px-3 py-3">{gift.message || "—"}</td>
                    <td className="px-3 py-3">{fmt(gift.paidAt || gift.createdAt)}</td>
                    <td className="px-3 py-3">
                      {editable && ["PENDING", "CLAIMED"].includes(gift.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={confirm.isPending}
                          onClick={() => confirm.mutate(gift.id)}
                        >
                          Xác nhận đã nhận
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {ledger.data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      Chưa có giao dịch quà mừng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {ledger.data && (
          <div className="flex items-center justify-between text-sm">
            <span>{ledger.data.totalCount} giao dịch</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((n) => n - 1)}
              >
                Trước
              </Button>
              <span className="px-2 py-2">Trang {pageNumber}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={pageNumber * ledger.data.pageSize >= ledger.data.totalCount}
                onClick={() => setPageNumber((n) => n + 1)}
              >
                Tiếp
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
