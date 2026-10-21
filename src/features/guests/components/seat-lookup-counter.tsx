"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check, CircleCheck, CircleDashed, Search, UserRound } from "lucide-react";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { ConfirmDialog } from "@/shared/feedback/confirm-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { checkInGuestPlaces, lookupGuestSeats, type CheckInResult, type SeatLookup } from "../api/seat-lookup.api";
import { QrCameraScanner } from "./qr-camera-scanner";

type CheckInOutcome = CheckInResult["places"][number]["result"];

function apiErrorMessage(error: unknown, action: "lookup" | "check-in") {
  if (!(error instanceof ApiError))
    return action === "lookup"
      ? "Không tra cứu được khách. Kiểm tra kết nối rồi thử lại."
      : "Chưa ghi nhận được check-in. Hãy kiểm tra trạng thái rồi thử lại.";
  if (error.status === 403)
    return "Không đủ quyền CHECKIN_MANAGE. Việc tra cứu không ghi nhận khách đã vào tiệc.";
  if (error.status === 404)
    return "Không tìm thấy khách trong đám cưới này hoặc link thiệp không còn khả dụng.";
  if (error.status === 400)
    return "Mã QR hoặc đường dẫn không hợp lệ. Hãy quét lại mã hoặc dán link thiệp.";
  if (error.status === 429) return "Đã tra cứu quá nhanh. Vui lòng đợi một chút rồi thử lại.";
  if (error.backendCode === "CHECKIN_EXCEPTION_REASON_REQUIRED")
    return "Khách đã RSVP từ chối chỗ này. Hãy nhập lý do ngoại lệ trước khi xác nhận check-in.";
  if (error.backendCode === "PLACE_NOT_IN_INVITATION")
    return "Danh sách chỗ đã thay đổi. Tra cứu lại thiệp để lấy trạng thái mới nhất.";
  if (error.status === 422)
    return "Không thể xác nhận check-in với trạng thái hiện tại. Tra cứu lại và kiểm tra từng người.";
  return action === "lookup"
    ? "Không tra cứu được khách. Vui lòng thử lại."
    : "Chưa ghi nhận được check-in. Vui lòng tra cứu lại trước khi thử tiếp.";
}

const attendanceStatus = {
  PENDING: "Chưa phản hồi RSVP",
  USED: "Đã xác nhận tham dự",
  UNUSED: "Đã từ chối chỗ RSVP",
} as const;

function attendanceLabel(
  seat: SeatLookup["seats"][number],
  latestOutcome?: CheckInOutcome,
) {
  if (latestOutcome === "CHECKED_IN") return "Đã check-in";
  if (latestOutcome === "ALREADY_CHECKED_IN" || seat.checkedInAt)
    return "Đã check-in trước đó";
  return "Chưa check-in";
}

function friendlyTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function SeatLookupCounter({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const [code, setCode] = useState("");
  const [lookupCode, setLookupCode] = useState<string | null>(null);
  const [guest, setGuest] = useState<SeatLookup | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<Record<string, CheckInOutcome>>({});
  const [exceptionReason, setExceptionReason] = useState("");
  const [lookupPending, setLookupPending] = useState(false);
  const [checkInPending, setCheckInPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lookupBusy = useRef(false);

  useEffect(() => input.current?.focus(), []);

  async function findGuest(value: string) {
    const normalized = value.trim();
    if (!normalized || lookupBusy.current || checkInPending) return;
    if (normalized.length > 2048) {
      setError("Link hoặc mã QR quá dài. Hãy kiểm tra nội dung đã dán.");
      return;
    }
    lookupBusy.current = true;
    setLookupPending(true);
    setGuest(null);
    setLookupCode(null);
    setSelectedIds([]);
    setOutcomes({});
    setExceptionReason("");
    setError("");
    setMessage("");
    setForbidden(false);
    try {
      const result = await lookupGuestSeats(api, weddingId, normalized);
      setGuest(result);
      setLookupCode(normalized);
      setMessage("Đã tra cứu. Chưa có check-in nào được ghi nhận; hãy chọn người và xác nhận bên dưới.");
      setCode("");
    } catch (cause) {
      setError(apiErrorMessage(cause, "lookup"));
      if (cause instanceof ApiError && cause.status === 403) setForbidden(true);
    } finally {
      lookupBusy.current = false;
      setLookupPending(false);
      input.current?.focus();
    }
  }

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void findGuest(code);
  }

  function togglePlace(placeId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...current, placeId] : current.filter((item) => item !== placeId),
    );
  }

  async function confirmCheckIn() {
    if (!guest || !lookupCode || selectedIds.length === 0 || checkInPending) return;
    const selectedUnused = guest.seats.some(
      (seat) => selectedIds.includes(seat.placeId) && seat.status === "UNUSED",
    );
    const reason = exceptionReason.trim();
    if (selectedUnused && !reason) {
      setError("Khách đã RSVP từ chối một chỗ được chọn. Nhập lý do ngoại lệ để tiếp tục.");
      return;
    }

    setCheckInPending(true);
    setError("");
    setMessage("");
    setForbidden(false);
    try {
      const result = await checkInGuestPlaces(
        api,
        weddingId,
        lookupCode,
        selectedIds,
        selectedUnused ? reason : undefined,
      );
      const resultById = Object.fromEntries(
        result.places.map((place) => [place.placeId, place.result]),
      ) as Record<string, CheckInOutcome>;
      setOutcomes((current) => ({ ...current, ...resultById }));
      setGuest((current) =>
        current
          ? {
              ...current,
              seats: current.seats.map((seat) => {
                const place = result.places.find((item) => item.placeId === seat.placeId);
                return place
                  ? { ...seat, checkedInAt: place.checkedInAt, checkInKind: place.kind }
                  : seat;
              }),
            }
          : current,
      );
      setSelectedIds([]);
      setExceptionReason("");
      const newlyChecked = result.places.filter((place) => place.result === "CHECKED_IN").length;
      const alreadyDone = result.places.length - newlyChecked;
      setMessage(
        alreadyDone > 0
          ? `Đã ghi nhận ${newlyChecked} người mới; ${alreadyDone} người đã check-in trước đó.`
          : `Đã check-in thành công cho ${newlyChecked} người.`,
      );
    } catch (cause) {
      setError(apiErrorMessage(cause, "check-in"));
      if (cause instanceof ApiError && cause.status === 403) setForbidden(true);
    } finally {
      setCheckInPending(false);
    }
  }

  const selectedUnused = guest?.seats.some(
    (seat) => selectedIds.includes(seat.placeId) && seat.status === "UNUSED",
  ) ?? false;

  return (
    <section className="mx-auto max-w-3xl space-y-6 pb-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Đón khách</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Quầy check-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quét QR bằng camera hoặc máy quét, hoặc dán link thiệp. Tra cứu chỉ đọc thông tin; khách
          chỉ được ghi nhận sau khi bạn chọn từng người và xác nhận.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <QrCameraScanner
          disabled={lookupPending || checkInPending}
          onDetected={(value) => {
            setCode(value);
            void findGuest(value);
          }}
        />
        <form onSubmit={submitLookup} className="flex flex-col gap-3 sm:flex-row">
          <Input
            ref={input}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Link hoặc mã QR của khách"
            placeholder="Dán link thiệp hoặc mã QR"
            className="h-12 min-w-0 flex-1"
            disabled={lookupPending || checkInPending}
          />
          <Button
            type="submit"
            disabled={!code.trim() || lookupPending || checkInPending}
            className="h-12 sm:min-w-36"
          >
            <Search aria-hidden="true" />
            {lookupPending ? "Đang tra…" : "Tra cứu khách"}
          </Button>
        </form>
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Tra cứu QR không tự check-in. Chỉ nút xác nhận ở cuối danh sách mới ghi nhận khách đã đến.</p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className={`rounded-xl border p-4 text-sm ${forbidden ? "border-amber-300 bg-amber-50 text-amber-950" : "border-red-200 bg-red-50 text-red-900"}`}
        >
          {error}
          {forbidden && <p className="mt-1">Cần quyền CHECKIN_MANAGE trong wedding này.</p>}
        </div>
      )}

      {guest && (
        <article className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-foreground">
              <UserRound aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Khách mời</p>
              <h2 className="break-words text-xl font-semibold sm:text-2xl">
                {guest.honorific ? `${guest.honorific} ` : ""}{guest.recipientName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {guest.seats.length} người trong lời mời
              </p>
            </div>
          </div>

          {!guest.published && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              Sơ đồ bàn chưa được công bố cho khách. Quầy đang hiển thị sơ đồ hiện tại của wedding.
            </p>
          )}

          <section aria-labelledby="checkin-people-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="checkin-people-heading" className="font-semibold">Từng người trong lời mời</h3>
              <p className="text-sm text-muted-foreground">Đã chọn {selectedIds.length}</p>
            </div>
            {guest.seats.length === 0 ? (
              <p className="mt-3 rounded-lg border p-4 text-sm text-muted-foreground">
                Thiệp chưa có chỗ tham dự để check-in.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {guest.seats.map((seat) => {
                  const outcome = outcomes[seat.placeId];
                  const checkedIn = Boolean(seat.checkedInAt) || outcome !== undefined;
                  const statusText = attendanceLabel(seat, outcome);
                  return (
                    <li key={seat.placeId} className="rounded-xl border p-4">
                      <label className="flex min-h-11 items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-5 accent-primary"
                          checked={selectedIds.includes(seat.placeId)}
                          onChange={(event) => togglePlace(seat.placeId, event.target.checked)}
                          disabled={checkedIn || checkInPending}
                          aria-label={`Chọn ${seat.personName ?? `người thứ ${seat.position}`} để check-in`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            {seat.personName ?? `Người thứ ${seat.position}`}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {seat.table
                              ? `Bàn ${seat.table}${seat.seatNumber !== null ? ` · Ghế ${seat.seatNumber}` : ""}`
                              : "Chưa xếp bàn"}
                            {` · ${attendanceStatus[seat.status]}`}
                          </span>
                        </span>
                      </label>
                      <span
                        className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${checkedIn ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}
                      >
                        {checkedIn ? (
                          <CircleCheck className="size-4" aria-hidden="true" />
                        ) : (
                          <CircleDashed className="size-4" aria-hidden="true" />
                        )}
                        {statusText}
                        {seat.checkedInAt && !outcome && ` · ${friendlyTime(seat.checkedInAt)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selectedUnused && (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Lý do check-in ngoại lệ <span aria-hidden="true">*</span></span>
              <span className="block text-muted-foreground">
                Có người được chọn đã RSVP từ chối. BE yêu cầu lưu lý do khi vẫn cho vào tiệc.
              </span>
              <Input
                value={exceptionReason}
                onChange={(event) => setExceptionReason(event.target.value)}
                maxLength={500}
                placeholder="Ví dụ: khách báo lại trực tiếp tại quầy"
                aria-required="true"
                disabled={checkInPending}
              />
            </label>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Chưa xác nhận thì dữ liệu check-in không thay đổi.
            </p>
            <ConfirmDialog
              trigger={
                <Button
                  type="button"
                  className="h-12 w-full sm:w-auto"
                  disabled={
                    selectedIds.length === 0 || checkInPending || (selectedUnused && !exceptionReason.trim())
                  }
                >
                  <Check aria-hidden="true" />
                  {checkInPending ? "Đang ghi nhận…" : `Xác nhận check-in · ${selectedIds.length}`}
                </Button>
              }
              title="Xác nhận khách đã đến?"
              description={`Sẽ ghi nhận check-in cho ${selectedIds.length} người đã chọn. Tra cứu trước đó chưa làm thay đổi trạng thái.`}
              cancelLabel="Quay lại"
              confirmLabel="Ghi nhận check-in"
              onConfirm={() => void confirmCheckIn()}
            />
          </div>
        </article>
      )}

      {message && (
        <p role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          {message}
        </p>
      )}
    </section>
  );
}
