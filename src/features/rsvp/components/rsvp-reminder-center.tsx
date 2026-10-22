"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CalendarClock, Mail, RefreshCw, Send } from "lucide-react";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { ConfirmDialog } from "@/shared/feedback/confirm-dialog";
import { EmptyState } from "@/shared/feedback/empty-state";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/ui/button";
import {
  getRsvpReminderSummary,
  listRsvpReminders,
  previewRsvpReminders,
  rsvpReminderKeys,
  saveRsvpReminderSettings,
  sendRsvpReminders,
  type RsvpReminderKind,
  type RsvpReminderPreview,
  type RsvpReminderStatus,
} from "../api/rsvp-reminders.api";

const fieldClass = "h-10 rounded-lg border bg-background px-3 text-sm";
const statusLabels: Record<RsvpReminderStatus, string> = {
  PENDING: "Đang chờ gửi",
  SENDING: "Đang gửi",
  SENT: "Đã gửi",
  FAILED: "Gửi lỗi",
  CANCELLED: "Đã hủy",
};
const kindLabels: Record<RsvpReminderKind, string> = {
  AUTO_3D: "Tự động · trước 3 ngày",
  AUTO_1D: "Tự động · trước 1 ngày",
  MANUAL: "Gửi thủ công",
};
const skipLabels: Record<string, string> = {
  DEADLINE_PASSED: "Đã qua hạn RSVP",
  ALREADY_RESPONDED: "Khách đã trả lời RSVP",
  LOCKED: "RSVP của khách đã khóa",
  NO_EMAIL: "Khách chưa có email hợp lệ",
  INVITATION_NOT_SENT: "Chưa gửi thiệp qua email",
  MANUAL_ALREADY_USED: "Đã dùng lượt nhắc thủ công",
  ALREADY_SCHEDULED: "Lượt nhắc này đã được lên lịch",
  RECENTLY_REMINDED: "Vừa được nhắc trong vòng 24 giờ",
  GUEST_NOT_FOUND: "Không tìm thấy khách trong wedding này",
};

function formatDate(value: string | null, timezone: string) {
  if (!value) return "Chưa thiết lập";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa thiết lập";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Không hoàn tất được thao tác. Vui lòng thử lại.";
  if (error.backendCode === "EMAIL_NOT_CONFIGURED")
    return "BE chưa cấu hình SMTP nên chưa thể gửi email nhắc RSVP.";
  if (error.backendCode === "WEDDING_SCOPE_REQUIRED")
    return "Tính năng nhắc RSVP cần quyền trên toàn wedding.";
  if (error.status === 403) return "Bạn không có quyền quản lý nhắc RSVP trong wedding này.";
  if (error.status === 422) return "Wedding đã đóng hoặc yêu cầu không còn hợp lệ.";
  return error.message;
}

export function RsvpReminderCenter({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const cache = useQueryClient();
  const { can, isWeddingWide } = usePermission();
  const hasWeddingWideRsvp = can("RSVP_VIEW") && isWeddingWide("RSVP_VIEW");
  const canManage = can("INVITATION_SEND") && isWeddingWide("INVITATION_SEND");
  const [status, setStatus] = useState<RsvpReminderStatus | "">("");
  const [kind, setKind] = useState<RsvpReminderKind | "">("");
  const [pageNumber, setPageNumber] = useState(1);
  const [preview, setPreview] = useState<RsvpReminderPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<"settings" | "preview" | "send" | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const filters = useMemo(
    () => ({
      status: status || undefined,
      kind: kind || undefined,
      page: pageNumber,
      pageSize: 25,
    }),
    [kind, pageNumber, status],
  );
  const summaryQuery = useQuery({
    queryKey: rsvpReminderKeys.summary(weddingId),
    queryFn: ({ signal }) => getRsvpReminderSummary(api, weddingId, signal),
    enabled: hasWeddingWideRsvp,
  });
  const historyQuery = useQuery({
    queryKey: rsvpReminderKeys.history(weddingId, filters),
    queryFn: ({ signal }) => listRsvpReminders(api, weddingId, filters, signal),
    enabled: hasWeddingWideRsvp,
  });
  const summary = summaryQuery.data;
  const history = historyQuery.data;
  const selectedCount = selectedIds.length;

  if (!hasWeddingWideRsvp)
    return (
      <EmptyState
        title="Cần quyền RSVP toàn wedding"
        description="Lịch nhắc được tính cho toàn bộ khách mời, nên Co-host chỉ có quyền RSVP theo nhóm không thể xem hoặc quản lý mục này."
      />
    );

  async function refreshAfterChange() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: rsvpReminderKeys.all(weddingId) }),
      cache.invalidateQueries({ queryKey: ["host-rsvp", weddingId] }),
    ]);
  }

  async function toggleAutomatic() {
    if (!summary || !canManage || busy) return;
    setBusy("settings");
    setActionError("");
    setNotice("");
    try {
      const updated = await saveRsvpReminderSettings(api, weddingId, !summary.autoEnabled);
      cache.setQueryData(rsvpReminderKeys.summary(weddingId), updated);
      setNotice(
        updated.autoEnabled ? "Đã bật lịch nhắc RSVP tự động." : "Đã tắt lịch nhắc RSVP tự động.",
      );
      await refreshAfterChange();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function loadPreview() {
    if (!canManage || busy) return;
    setBusy("preview");
    setActionError("");
    setNotice("");
    try {
      const result = await previewRsvpReminders(api, weddingId);
      setPreview(result);
      setSelectedIds(result.eligible.map((guest) => guest.guestId));
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function sendSelected() {
    if (!canManage || !preview || selectedIds.length === 0 || busy) return;
    setBusy("send");
    setActionError("");
    setNotice("");
    try {
      const result = await sendRsvpReminders(api, weddingId, selectedIds);
      setNotice(
        result.queued
          ? `Đã đưa ${result.queued} email vào hàng đợi. Dự kiến gửi lúc ${formatDate(result.sendAt, summary?.timezone ?? "Asia/Ho_Chi_Minh")}.`
          : "Không có email nào được đưa vào hàng đợi. Hãy xem lý do bị bỏ qua bên dưới.",
      );
      setPreview({ sendAt: result.sendAt, eligible: [], skipped: result.skipped });
      setSelectedIds([]);
      await refreshAfterChange();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function toggleGuest(guestId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, guestId])] : current.filter((id) => id !== guestId),
    );
  }

  function changeStatus(event: FormEvent<HTMLSelectElement>) {
    setStatus(event.currentTarget.value as RsvpReminderStatus | "");
    setPageNumber(1);
  }

  function changeKind(event: FormEvent<HTMLSelectElement>) {
    setKind(event.currentTarget.value as RsvpReminderKind | "");
    setPageNumber(1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nhắc RSVP"
        description="Theo dõi lịch tự động, nhắc khách chưa phản hồi và xem trạng thái gửi email."
        action={
          canManage ? (
            <Button variant="outline" onClick={() => void loadPreview()} disabled={busy !== null}>
              <RefreshCw aria-hidden="true" />
              {busy === "preview" ? "Đang kiểm tra…" : "Xem trước lượt nhắc"}
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
          {actionError}
        </p>
      )}
      {notice && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-900"
        >
          {notice}
        </p>
      )}
      {summaryQuery.isPending && <LoadingState label="Đang tải cấu hình nhắc RSVP…" />}
      {summaryQuery.isError && (
        <ErrorState error={summaryQuery.error} retry={() => void summaryQuery.refetch()} />
      )}

      {summary && (
        <>
          {!summary.emailConfigured && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <Mail className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p>
                BE chưa cấu hình email gửi đi. Bạn vẫn xem được lịch và lịch sử, nhưng gửi nhắc thủ
                công sẽ bị từ chối cho đến khi SMTP được cấu hình.
              </p>
            </div>
          )}

          <section
            className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6"
            aria-labelledby="reminder-settings-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="reminder-settings-heading" className="text-lg font-semibold">
                  Lịch nhắc tự động
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nhắc trước hạn RSVP 3 ngày và 1 ngày; chỉ gửi khách chưa phản hồi, đã nhận thiệp
                  email và chưa bị khóa RSVP.
                </p>
              </div>
              {canManage ? (
                <Button
                  variant={summary.autoEnabled ? "outline" : "default"}
                  onClick={() => void toggleAutomatic()}
                  disabled={busy !== null}
                >
                  <BellRing aria-hidden="true" />
                  {busy === "settings"
                    ? "Đang lưu…"
                    : summary.autoEnabled
                      ? "Tắt tự động"
                      : "Bật tự động"}
                </Button>
              ) : (
                <span className="rounded-full bg-muted px-3 py-1 text-sm">Chỉ xem</span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric label="Chưa trả lời" value={summary.notResponded} />
              <Metric label="Có thể nhắc ngay" value={summary.canRemindNow} />
              <Metric label="Đang chờ / gửi" value={summary.counts.pending} />
              <Metric label="Đã gửi thành công" value={summary.counts.sent} />
              <Metric label="Gửi lỗi" value={summary.counts.failed} />
              <Metric label="Đã hủy" value={summary.counts.cancelled} />
            </div>

            <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <h3 className="font-medium">Các lượt nhắc</h3>
                {summary.autoRounds.map((round) => (
                  <div
                    key={round.kind}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <span>{kindLabels[round.kind]}</span>
                    <span className="text-muted-foreground">
                      {round.state === "OFF"
                        ? "Chưa có hạn RSVP hoặc đang tắt"
                        : `${round.state === "STARTED" ? "Đã đến lịch" : "Dự kiến"}: ${formatDate(round.at, summary.timezone)}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <h3 className="font-medium">Quy tắc gửi</h3>
                <p>
                  Hạn RSVP: <strong>{formatDate(summary.rsvpDeadline, summary.timezone)}</strong>
                </p>
                <p>
                  Giờ gửi theo múi giờ wedding: <strong>{summary.sendingHours}</strong>
                </p>
                <p>
                  Tối đa <strong>{summary.maxRemindersPerGuest}</strong> email nhắc mỗi khách; các
                  lượt cách nhau ít nhất 24 giờ.
                </p>
              </div>
            </div>
          </section>

          {canManage && (
            <section
              className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6"
              aria-labelledby="manual-reminder-heading"
            >
              <div>
                <h2 id="manual-reminder-heading" className="text-lg font-semibold">
                  Nhắc khách thủ công
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Xem trước người đủ điều kiện và các trường hợp bị bỏ qua trước khi xác nhận gửi.
                </p>
              </div>
              {!preview ? (
                <Button
                  variant="outline"
                  onClick={() => void loadPreview()}
                  disabled={busy !== null}
                >
                  <CalendarClock aria-hidden="true" />
                  {busy === "preview" ? "Đang kiểm tra…" : "Kiểm tra khách có thể nhắc"}
                </Button>
              ) : (
                <>
                  <p className="rounded-lg bg-muted p-3 text-sm">
                    Lượt email sẽ được gửi lúc{" "}
                    <strong>{formatDate(preview.sendAt, summary.timezone)}</strong>. Giờ gửi tuân
                    theo múi giờ wedding.
                  </p>
                  {preview.eligible.length > 0 ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm">
                          Đủ điều kiện: <strong>{preview.eligible.length}</strong> · Đã chọn:{" "}
                          <strong>{selectedCount}</strong>
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedIds(preview.eligible.map((guest) => guest.guestId))
                            }
                          >
                            Chọn tất cả
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedIds([])}
                          >
                            Bỏ chọn
                          </Button>
                        </div>
                      </div>
                      <ul className="max-h-80 divide-y overflow-y-auto rounded-xl border">
                        {preview.eligible.map((guest) => (
                          <li key={guest.guestId} className="flex items-center gap-3 p-3">
                            <input
                              type="checkbox"
                              className="size-5 accent-primary"
                              checked={selectedIds.includes(guest.guestId)}
                              onChange={(event) => toggleGuest(guest.guestId, event.target.checked)}
                              aria-label={`Chọn nhắc ${guest.recipientName}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">
                                {guest.recipientName}
                              </span>
                              <span className="block truncate text-sm text-muted-foreground">
                                {guest.email}
                              </span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Đã gửi {guest.remindersSent}/{summary.maxRemindersPerGuest}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Hiện không có khách nào đủ điều kiện nhận nhắc RSVP thủ công.
                    </p>
                  )}

                  {preview.skipped.length > 0 && (
                    <details className="rounded-lg border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Bỏ qua {preview.skipped.length} khách
                      </summary>
                      <ul className="mt-3 space-y-2 text-sm">
                        {preview.skipped.map((guest, index) => (
                          <li
                            key={`${guest.guestId}-${guest.reason}-${index}`}
                            className="flex flex-wrap justify-between gap-2 border-t pt-2"
                          >
                            <span>{guest.recipientName || "Khách không tồn tại"}</span>
                            <span className="text-muted-foreground">
                              {skipLabels[guest.reason] ?? guest.reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void loadPreview()}
                      disabled={busy !== null}
                    >
                      Làm mới xem trước
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          disabled={
                            !summary.emailConfigured || selectedCount === 0 || busy !== null
                          }
                        >
                          <Send aria-hidden="true" />
                          {busy === "send"
                            ? "Đang đưa vào hàng đợi…"
                            : `Gửi nhắc cho ${selectedCount} khách`}
                        </Button>
                      }
                      title="Xác nhận gửi email nhắc RSVP?"
                      description={`BE sẽ kiểm tra lại điều kiện và đưa email của ${selectedCount} khách đã chọn vào hàng đợi. Gửi thủ công chỉ được thực hiện một lần cho mỗi khách.`}
                      cancelLabel="Quay lại"
                      confirmLabel="Đưa vào hàng đợi"
                      onConfirm={() => void sendSelected()}
                    />
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      <section
        className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6"
        aria-labelledby="reminder-history-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="reminder-history-heading" className="text-lg font-semibold">
              Lịch sử email nhắc
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Trạng thái được cập nhật sau khi background worker xử lý email.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="reminder-status-filter">
              Lọc trạng thái
            </label>
            <select
              id="reminder-status-filter"
              className={fieldClass}
              value={status}
              onChange={changeStatus}
            >
              <option value="">Mọi trạng thái</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="reminder-kind-filter">
              Lọc loại
            </label>
            <select
              id="reminder-kind-filter"
              className={fieldClass}
              value={kind}
              onChange={changeKind}
            >
              <option value="">Mọi lượt nhắc</option>
              {Object.entries(kindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {historyQuery.isPending && <LoadingState label="Đang tải lịch sử nhắc RSVP…" />}
        {historyQuery.isError && (
          <ErrorState error={historyQuery.error} retry={() => void historyQuery.refetch()} />
        )}
        {history && history.items.length === 0 && (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            Chưa có email nhắc phù hợp bộ lọc.
          </p>
        )}
        {history && history.items.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Khách</th>
                    <th className="p-3 font-medium">Lượt</th>
                    <th className="p-3 font-medium">Trạng thái</th>
                    <th className="p-3 font-medium">Thời điểm</th>
                    <th className="p-3 font-medium">Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        <span className="block font-medium">{item.recipientName}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.recipient ?? "Email ẩn theo quyền tài khoản"}
                        </span>
                      </td>
                      <td className="p-3">{kindLabels[item.kind]}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "SENT" ? "bg-green-100 text-green-900" : item.status === "FAILED" ? "bg-red-100 text-red-900" : item.status === "CANCELLED" ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-950"}`}
                        >
                          {statusLabels[item.status]}
                        </span>
                      </td>
                      <td className="p-3">
                        {formatDate(
                          item.sentAt ?? item.nextAttemptAt,
                          summary?.timezone ?? "Asia/Ho_Chi_Minh",
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {item.lastErrorCode ??
                          (item.sentAt
                            ? `Đã gửi · ${item.attemptCount} lần thử`
                            : "Đang chờ worker")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>
                Trang {history.page} · {history.totalCount} lượt nhắc
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                  disabled={history.page <= 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((current) => current + 1)}
                  disabled={history.page * history.pageSize >= history.totalCount}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}
