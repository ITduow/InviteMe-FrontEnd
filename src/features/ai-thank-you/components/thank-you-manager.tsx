"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { Button } from "@/shared/ui/button";
import {
  approveThankYouTemplate,
  editThankYouTemplate,
  generateThankYouTemplateOptions,
  getThankYouBatch,
  listThankYouGuests,
  listThankYouTemplates,
  previewThankYouTemplate,
  queueThankYouTemplateMessages,
  retryThankYouBatch,
  type ThankYouTemplate,
} from "../api/thank-you.api";

const tones = [
  { id: "WARM", name: "Ấm áp" },
  { id: "FORMAL", name: "Trang trọng" },
  { id: "FRIENDLY", name: "Thân mật" },
] as const;

function niceError(error: unknown) {
  if (error instanceof ApiError && error.backendCode === "AI_NOT_CONFIGURED")
    return "AI chưa được cấu hình; hệ thống sẽ dùng mẫu dự phòng nếu nhà cung cấp gặp lỗi.";
  if (error instanceof ApiError && error.status === 429)
    return "Bạn đã dùng hết lượt tạo thư trong thời gian ngắn. Hãy đợi rồi thử lại.";
  if (error instanceof ApiError && error.status === 409)
    return "Mẫu thư đã thay đổi trên máy khác. Tải lại trước khi tiếp tục.";
  if (error instanceof ApiError && error.backendCode === "THANK_YOU_CONTACT_REQUIRED")
    return "Một số khách chưa có thông tin liên hệ cho kênh đã chọn.";
  return "Không hoàn tất được thao tác. Vui lòng kiểm tra thông tin và thử lại.";
}

export function ThankYouManager({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const client = useQueryClient();
  const [guestPage, setGuestPage] = useState(1);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [tone, setTone] = useState<(typeof tones)[number]["id"]>("WARM");
  const [variantCount, setVariantCount] = useState<1 | 3>(3);
  const [includeGiftAmount, setIncludeGiftAmount] = useState(false);
  const [sendChannels, setSendChannels] = useState<string[]>(["EMAIL"]);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [content, setContent] = useState("");
  const [previewGuestId, setPreviewGuestId] = useState("");
  const [previewContent, setPreviewContent] = useState("");
  const [error, setError] = useState("");
  const [batchId, setBatchId] = useState("");

  const guests = useQuery({
    queryKey: ["thank-you-guests", weddingId, guestPage],
    queryFn: ({ signal }) => listThankYouGuests(api, weddingId, guestPage, signal),
  });
  const templates = useQuery({
    queryKey: ["thank-you-templates", weddingId],
    queryFn: ({ signal }) => listThankYouTemplates(api, weddingId, signal),
  });
  const activeTemplate = useMemo(
    () => templates.data?.items.find((template) => template.id === activeTemplateId),
    [templates.data, activeTemplateId],
  );
  const batch = useQuery({
    queryKey: ["thank-you-batch", weddingId, batchId],
    queryFn: ({ signal }) => getThankYouBatch(api, weddingId, batchId, signal),
    enabled: Boolean(batchId),
    refetchInterval: (query) => (query.state.data?.pendingCount ? 2500 : false),
  });

  const invalidateTemplates = () =>
    client.invalidateQueries({ queryKey: ["thank-you-templates", weddingId] });
  const generate = useMutation({
    mutationFn: () =>
      generateThankYouTemplateOptions(api, weddingId, {
        guestIds: selectedGuestIds,
        variantCount,
        tone,
        includeGiftAmount,
      }),
    onSuccess: async (options) => {
      setError("");
      setActiveTemplateId(options[0]?.id ?? "");
      setContent(options[0]?.content ?? "");
      setPreviewContent("");
      await invalidateTemplates();
    },
    onError: (reason) => setError(niceError(reason)),
  });
  const save = useMutation({
    mutationFn: () =>
      activeTemplate
        ? editThankYouTemplate(api, weddingId, activeTemplate.id, {
            content,
            expectedVersion: activeTemplate.version,
            includeGiftAmount: activeTemplate.includesGiftAmount,
          })
        : Promise.reject(new Error("Select a template")),
    onSuccess: async (template) => {
      setError("");
      setContent(template.content);
      await invalidateTemplates();
    },
    onError: (reason) => setError(niceError(reason)),
  });
  const approve = useMutation({
    mutationFn: () =>
      activeTemplate
        ? approveThankYouTemplate(api, weddingId, activeTemplate.id, activeTemplate.version)
        : Promise.reject(new Error("Select a template")),
    onSuccess: async () => {
      setError("");
      await invalidateTemplates();
    },
    onError: (reason) => setError(niceError(reason)),
  });
  const preview = useMutation({
    mutationFn: () =>
      activeTemplate && previewGuestId
        ? previewThankYouTemplate(api, weddingId, activeTemplate.id, previewGuestId)
        : Promise.reject(new Error("Select a template and recipient")),
    onSuccess: (result) => {
      setError("");
      setPreviewContent(result.renderedContent);
    },
    onError: (reason) => setError(niceError(reason)),
  });
  const send = useMutation({
    mutationFn: () =>
      activeTemplate
        ? queueThankYouTemplateMessages(
            api,
            weddingId,
            activeTemplate.id,
            selectedGuestIds,
            sendChannels,
            crypto.randomUUID(),
          )
        : Promise.reject(new Error("Select an approved template")),
    onSuccess: (result) => {
      setError("");
      setBatchId(result.id);
    },
    onError: (reason) => setError(niceError(reason)),
  });
  const retry = useMutation({
    mutationFn: () => retryThankYouBatch(api, weddingId, batchId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["thank-you-batch", weddingId, batchId] });
    },
  });

  function toggleGuest(id: string) {
    setSelectedGuestIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < 180 ? [...ids, id] : ids,
    );
  }
  function toggleChannel(channel: string) {
    setSendChannels((channels) =>
      channels.includes(channel) ? channels.filter((x) => x !== channel) : [...channels, channel],
    );
  }
  function selectTemplate(template: ThankYouTemplate) {
    setActiveTemplateId(template.id);
    setContent(template.content);
    setPreviewContent("");
    setError("");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Thư cảm ơn cá nhân hóa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI tạo một vài mẫu trong một lần. Couple duyệt mẫu dùng chung; tên và đường dẫn riêng được
          thêm lúc gửi cho từng khách.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="font-semibold">1. Chọn người nhận và tạo mẫu</h2>
          <p className="text-sm text-muted-foreground">
            Tạo 1 hoặc 3 phương án bằng một yêu cầu AI duy nhất. AI chỉ nhận số liệu tổng hợp về
            nhóm, RSVP và lời chúc công khai, không nhận tên hay nội dung lời chúc riêng.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Tông giọng
            <select
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
              value={tone}
              onChange={(event) => setTone(event.target.value as typeof tone)}
            >
              {tones.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Số phương án
            <select
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
              value={variantCount}
              onChange={(event) => setVariantCount(Number(event.target.value) as 1 | 3)}
            >
              <option value={1}>1 mẫu</option>
              <option value={3}>3 mẫu trong 1 lần AI</option>
            </select>
          </label>
          <label className="flex items-start gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={includeGiftAmount}
              onChange={(event) => setIncludeGiftAmount(event.target.checked)}
            />
            <span>
              Ghi rõ số tiền quà đã xác nhận; chỉ hiển thị cho giao dịch PAID và chỉ khi bạn bật mục
              này
            </span>
          </label>
        </div>
        {guests.isPending ? (
          <p role="status">Đang tải danh sách khách…</p>
        ) : guests.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Không tải được danh sách khách.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  {["Chọn", "Khách", "Nhóm", "Liên hệ"].map((label) => (
                    <th key={label} className="px-3 py-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guests.data.items.map((guest) => (
                  <tr key={guest.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${guest.recipientName}`}
                        checked={selectedGuestIds.includes(guest.id)}
                        onChange={() => toggleGuest(guest.id)}
                      />
                    </td>
                    <td className="px-3 py-2">{guest.recipientName}</td>
                    <td className="px-3 py-2">{guest.group?.name ?? guest.side}</td>
                    <td className="px-3 py-2">{guest.email || guest.phone || "Chưa có"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {guests.data && (
          <div className="flex items-center justify-between text-sm">
            <span>
              Đang chọn {selectedGuestIds.length}/180 · Trang {guestPage}/
              {Math.max(1, Math.ceil(guests.data.totalItems / guests.data.pageSize))}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={guestPage <= 1}
                onClick={() => setGuestPage((page) => page - 1)}
              >
                Trước
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={guestPage * guests.data.pageSize >= guests.data.totalItems}
                onClick={() => setGuestPage((page) => page + 1)}
              >
                Tiếp
              </Button>
            </div>
          </div>
        )}
        <Button
          type="button"
          disabled={selectedGuestIds.length === 0 || generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? "Đang tạo phương án…" : `Tạo ${variantCount} mẫu bằng một lần AI`}
        </Button>
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="font-semibold">2. Chọn, xem thử và duyệt mẫu dùng chung</h2>
          <p className="text-sm text-muted-foreground">
            Mẫu có thể dùng lại cho nhiều batch. Chỉnh sửa và duyệt mẫu một lần; từng khách vẫn có
            job gửi và trạng thái riêng.
          </p>
        </div>
        {templates.isPending ? (
          <p role="status">Đang tải mẫu…</p>
        ) : templates.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Không tải được danh sách mẫu.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.25fr)]">
            <div className="max-h-[30rem] space-y-2 overflow-auto">
              {templates.data.items.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={`w-full rounded-lg border p-3 text-left ${template.id === activeTemplateId ? "border-primary bg-primary/5" : ""}`}
                >
                  <strong>
                    {template.tone === "WARM"
                      ? "Ấm áp"
                      : template.tone === "FORMAL"
                        ? "Trang trọng"
                        : "Thân mật"}
                  </strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {template.status === "APPROVED" ? "Đã duyệt · dùng được" : "Bản nháp"}
                    {template.usedFallback ? " · mẫu dự phòng" : ""}
                    {template.includesGiftAmount ? " · có câu quà tặng tùy điều kiện" : ""}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {new Date(template.createdAt).toLocaleString("vi-VN")}
                  </span>
                </button>
              ))}
              {templates.data.items.length === 0 && (
                <p className="rounded-lg bg-muted p-4 text-sm">
                  Chưa có mẫu. Chọn khách và tạo mẫu ở trên.
                </p>
              )}
            </div>
            <div className="space-y-3">
              {activeTemplate ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-medium">Mẫu dùng chung</h3>
                      <p className="text-xs text-muted-foreground">
                        {activeTemplate.status} · phiên bản {activeTemplate.version}
                        {activeTemplate.includesGiftAmount
                          ? " · câu quà chỉ hiện với giao dịch PAID"
                          : " · không nhắc số tiền"}
                      </p>
                    </div>
                    {activeTemplate.status === "APPROVED" && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
                        Đã duyệt
                      </span>
                    )}
                  </div>
                  <textarea
                    aria-label="Nội dung mẫu thư cảm ơn"
                    className="min-h-64 w-full rounded-lg border bg-background p-3 text-sm leading-7"
                    maxLength={3000}
                    value={content}
                    readOnly={activeTemplate.status === "APPROVED"}
                    onChange={(event) => setContent(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dùng đúng một ký hiệu <code>{"{{GuestName}}"}</code>.{" "}
                    {activeTemplate.includesGiftAmount && (
                      <>
                        Ký hiệu <code>{"{{GiftThanks}}"}</code> được thay bằng câu cảm ơn khoản PAID
                        hoặc tự bỏ đi.
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-sm">
                      Khách xem thử
                      <select
                        className="mt-1 block min-w-56 rounded-md border bg-background px-3 py-2"
                        value={previewGuestId}
                        onChange={(event) => setPreviewGuestId(event.target.value)}
                      >
                        <option value="">Chọn khách đã tải ở trang hiện tại</option>
                        {guests.data?.items.map((guest) => (
                          <option key={guest.id} value={guest.id}>
                            {guest.recipientName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!previewGuestId || preview.isPending}
                      onClick={() => preview.mutate()}
                    >
                      {preview.isPending ? "Đang xem…" : "Xem thử"}
                    </Button>
                  </div>
                  {previewContent && (
                    <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                      {previewContent}
                    </pre>
                  )}
                  {activeTemplate.status === "DRAFT" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={save.isPending}
                        onClick={() => save.mutate()}
                      >
                        Lưu chỉnh sửa
                      </Button>
                      <Button
                        type="button"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate()}
                      >
                        Duyệt mẫu
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-lg bg-muted p-5 text-sm">Chọn một mẫu để xem và rà soát.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="font-semibold">3. Gửi mẫu cho người nhận</h2>
          <p className="text-sm text-muted-foreground">
            Có thể gửi cùng một mẫu cho tối đa 180 khách trong batch. Tên và link cá nhân được điền
            riêng tại thời điểm gửi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium">Kênh gửi:</span>
          {(["EMAIL", "SMS"] as const).map((channel) => (
            <label key={channel} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendChannels.includes(channel)}
                onChange={() => toggleChannel(channel)}
              />
              {channel === "EMAIL" ? "Email" : "SMS"}
            </label>
          ))}
        </div>
        <Button
          type="button"
          disabled={
            !activeTemplate ||
            activeTemplate.status !== "APPROVED" ||
            !selectedGuestIds.length ||
            !sendChannels.length ||
            send.isPending
          }
          onClick={() => send.mutate()}
        >
          {send.isPending
            ? "Đang đưa vào hàng đợi…"
            : `Gửi mẫu đã duyệt cho ${selectedGuestIds.length} khách`}
        </Button>
      </section>

      {batchId && (
        <section className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">4. Trạng thái gửi</h2>
              <p className="text-sm text-muted-foreground">
                Batch {batchId.slice(0, 8)} · {batch.data?.status ?? "Đang xếp hàng"}
              </p>
            </div>
            {batch.data?.failedCount ? (
              <Button
                type="button"
                variant="outline"
                disabled={retry.isPending}
                onClick={() => retry.mutate()}
              >
                Gửi lại thư lỗi
              </Button>
            ) : null}
          </div>
          {batch.isPending ? (
            <p>Đang tải tiến độ…</p>
          ) : batch.data ? (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>Đã gửi: {batch.data.sentCount}</span>
                <span>Lỗi: {batch.data.failedCount}</span>
                <span>Đang chờ: {batch.data.pendingCount}</span>
              </div>
              <div className="space-y-2">
                {batch.data.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/50 p-3 text-sm"
                  >
                    <span>
                      {job.channel} · {job.recipient}
                    </span>
                    <span>
                      {job.status}
                      {job.errorCode ? ` · ${job.errorCode}` : ""}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Mỗi khách và kênh có trạng thái riêng. Khách mở lại thư qua link cá nhân sau khi có
                lần gửi thành công.
              </p>
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
