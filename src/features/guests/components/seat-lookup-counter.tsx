"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  CircleCheck,
  CircleDashed,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { ConfirmDialog } from "@/shared/feedback/confirm-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  addReceptionWalkIn,
  checkInGuestPlaces,
  lookupGuestSeats,
  searchReceptionGuests,
  type ReceptionGuest,
  type CheckInResult,
  type SeatLookup,
  type WalkInInput,
} from "../api/seat-lookup.api";
import { QrCameraScanner } from "./qr-camera-scanner";

type CheckInOutcome = CheckInResult["places"][number]["result"];

function apiErrorMessage(error: unknown, action: "lookup" | "check-in" | "search" | "walk-in") {
  if (!(error instanceof ApiError))
    return action === "walk-in"
      ? "Chưa thêm được khách vãng lai. Nếu mạng bị gián đoạn, hãy thử lại nguyên thông tin để tránh tạo trùng."
      : action === "search"
        ? "Không tìm được khách. Kiểm tra kết nối rồi thử lại."
        : action === "lookup"
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
  if (error.backendCode === "WALK_IN_OVER_CAPACITY")
    return "Wedding đã hết sức chứa. Nhập lý do ngoại lệ rồi gửi lại nếu được Couple cho phép.";
  if (error.backendCode === "IDEMPOTENCY_KEY_REUSED")
    return "Yêu cầu walk-in này đã dùng khóa khác với dữ liệu hiện tại. Hãy tải lại quầy và kiểm tra danh sách khách.";
  if (action === "search" && error.status === 400)
    return "Nhập ít nhất 2 ký tự tên hoặc 4 số cuối của số điện thoại để tìm khách.";
  if (error.status === 422)
    return "Không thể xác nhận check-in với trạng thái hiện tại. Tra cứu lại và kiểm tra từng người.";
  return action === "lookup"
    ? "Không tra cứu được khách. Vui lòng thử lại."
    : action === "walk-in"
      ? "Chưa thêm được khách vãng lai. Hãy giữ nguyên thông tin và thử lại để hệ thống nhận diện lần gửi trước."
      : action === "search"
        ? "Không tìm được khách. Vui lòng thử lại."
        : "Chưa ghi nhận được check-in. Vui lòng tra cứu lại trước khi thử tiếp.";
}

const attendanceStatus = {
  PENDING: "Chưa phản hồi RSVP",
  USED: "Đã xác nhận tham dự",
  UNUSED: "Đã từ chối chỗ RSVP",
} as const;

function attendanceLabel(seat: SeatLookup["seats"][number], latestOutcome?: CheckInOutcome) {
  if (latestOutcome === "CHECKED_IN") return "Đã check-in";
  if (latestOutcome === "ALREADY_CHECKED_IN" || seat.checkedInAt) return "Đã check-in trước đó";
  return "Chưa check-in";
}

function friendlyTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function SeatLookupCounter({ weddingId }: { weddingId: string }) {
  const { api, realtime } = useRuntime();
  const [mode, setMode] = useState<"QR" | "SEARCH" | "WALK_IN">("QR");
  const [code, setCode] = useState("");
  const [lookupCode, setLookupCode] = useState<string | null>(null);
  const [guest, setGuest] = useState<SeatLookup | ReceptionGuest | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ReceptionGuest[]>([]);
  const [searchPending, setSearchPending] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null);
  const [walkInGuestId, setWalkInGuestId] = useState<string | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [walkInHonorific, setWalkInHonorific] = useState("");
  const [walkInSide, setWalkInSide] = useState<NonNullable<WalkInInput["side"]>>("UNSPECIFIED");
  const [walkInPeople, setWalkInPeople] = useState("1");
  const [walkInNames, setWalkInNames] = useState("");
  const [walkInReason, setWalkInReason] = useState("");
  const [walkInPending, setWalkInPending] = useState(false);
  const walkInAttempt = useRef<{ signature: string; key: string } | null>(null);
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

  useEffect(() => {
    const refreshCurrentGuest = () => {
      if (!guest || lookupBusy.current) return;
      if (lookupCode) {
        void lookupGuestSeats(api, weddingId, lookupCode)
          .then((latest) =>
            setGuest((current) => (current?.guestId === latest.guestId ? latest : current)),
          )
          .catch(() => undefined);
      } else if (activeSearchQuery) {
        void searchReceptionGuests(api, weddingId, activeSearchQuery)
          .then((latest) =>
            setGuest(latest.find((item) => item.guestId === guest.guestId) ?? guest),
          )
          .catch(() => undefined);
      }
    };
    const unsubscribe = realtime.onPlanningChange((change) => {
      if (
        (change.type === "GuestCheckedIn" || change.type === "GuestCheckInVoided") &&
        change.entityId === guest?.guestId
      ) {
        refreshCurrentGuest();
      }
    });
    const unsubscribeResync = realtime.onResync(refreshCurrentGuest);
    return () => {
      unsubscribe();
      unsubscribeResync();
    };
  }, [activeSearchQuery, api, guest, lookupCode, realtime, weddingId]);

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
    setActiveSearchQuery(null);
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
      setActiveSearchQuery(null);
      setMessage(
        "Đã tra cứu. Chưa có check-in nào được ghi nhận; hãy chọn người và xác nhận bên dưới.",
      );
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
    if (
      !guest ||
      (!lookupCode && !("guestId" in guest)) ||
      selectedIds.length === 0 ||
      checkInPending
    )
      return;
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
        lookupCode ? { code: lookupCode } : { guestId: guest.guestId },
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

  async function findReceptionGuests(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchText.trim();
    if (query.length < 2 || searchPending || checkInPending || walkInPending) return;
    setSearchPending(true);
    setSearchQuery(query);
    setSearchResults([]);
    setGuest(null);
    setLookupCode(null);
    setActiveSearchQuery(null);
    setSelectedIds([]);
    setOutcomes({});
    setError("");
    setMessage("");
    setForbidden(false);
    try {
      const result = await searchReceptionGuests(api, weddingId, query);
      setSearchResults(result);
      setMessage(
        result.length
          ? `Tìm thấy ${result.length} kết quả. Chọn đúng khách để xem từng chỗ.`
          : "Không tìm thấy khách trong danh sách.",
      );
    } catch (cause) {
      setError(apiErrorMessage(cause, "search"));
      if (cause instanceof ApiError && cause.status === 403) setForbidden(true);
    } finally {
      setSearchPending(false);
    }
  }

  function selectReceptionGuest(result: ReceptionGuest) {
    setGuest(result);
    setLookupCode(null);
    setActiveSearchQuery(searchQuery);
    setSelectedIds([]);
    setOutcomes({});
    setError("");
    setMessage("Đã tìm thấy khách. Chọn từng người rồi xác nhận check-in.");
    setForbidden(false);
  }

  function startCompanionWalkIn(result: ReceptionGuest) {
    setWalkInGuestId(result.guestId);
    setWalkInName("");
    setWalkInHonorific("");
    setWalkInSide("UNSPECIFIED");
    setWalkInPeople("1");
    setWalkInNames("");
    setWalkInReason("");
    setError("");
    setMode("WALK_IN");
  }

  async function submitWalkIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const people = Number(walkInPeople);
    const recipientName = walkInName.trim();
    const names = walkInNames
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (!Number.isInteger(people) || people < 1 || people > 20) {
      setError("Số người walk-in phải từ 1 đến 20.");
      return;
    }
    if (!walkInGuestId && !recipientName) {
      setError("Nhập tên khách vãng lai.");
      return;
    }
    if (names.length > (walkInGuestId ? people : people - 1)) {
      setError(
        walkInGuestId
          ? "Số tên người đi cùng không được vượt số người thêm."
          : "Khách chính đã tính trong số người; số tên đi cùng phải ít hơn tổng số người.",
      );
      return;
    }
    const input: WalkInInput = {
      guestId: walkInGuestId,
      recipientName: walkInGuestId ? null : recipientName,
      people,
      honorific: walkInGuestId ? null : walkInHonorific.trim() || null,
      side: walkInGuestId ? null : walkInSide,
      names: names.length ? names : null,
      overrideReason: walkInReason.trim() || null,
    };
    const signature = JSON.stringify(input);
    if (!walkInAttempt.current || walkInAttempt.current.signature !== signature) {
      walkInAttempt.current = { signature, key: crypto.randomUUID() };
    }

    setWalkInPending(true);
    setError("");
    setMessage("");
    setForbidden(false);
    try {
      const result = await addReceptionWalkIn(api, weddingId, input, walkInAttempt.current.key);
      walkInAttempt.current = null;
      const seats = result.places.map((place) => ({
        placeId: place.placeId,
        position: place.position,
        participantId: null,
        personName: place.personName,
        status: place.status,
        table: place.table,
        seatNumber: place.seatNumber,
        checkedInAt: place.checkedInAt,
        checkInKind: place.kind,
      }));
      const walkInGuest: ReceptionGuest = {
        guestId: result.guestId,
        recipientName: result.recipientName,
        honorific: result.honorific,
        side: walkInSide,
        places: seats.length,
        checkedIn: seats.length,
        tables: [...new Set(seats.flatMap((seat) => (seat.table ? [seat.table] : [])))],
        seats,
      };
      setGuest(walkInGuest);
      setLookupCode(null);
      setActiveSearchQuery(null);
      setSelectedIds([]);
      setOutcomes(Object.fromEntries(result.places.map((place) => [place.placeId, place.result])));
      setMessage(
        result.newGuest
          ? `Đã tạo walk-in và check-in ${result.places.length} người${result.overCapacity ? " (đã vượt sức chứa theo lý do được ghi nhận)" : ""}.`
          : `Đã thêm và check-in ${result.places.length} người đi cùng.`,
      );
    } catch (cause) {
      setError(apiErrorMessage(cause, "walk-in"));
      if (cause instanceof ApiError && cause.status === 403) setForbidden(true);
    } finally {
      setWalkInPending(false);
    }
  }

  const selectedUnused =
    guest?.seats.some((seat) => selectedIds.includes(seat.placeId) && seat.status === "UNUSED") ??
    false;

  return (
    <section className="mx-auto max-w-3xl space-y-6 pb-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Đón khách</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Quầy check-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quét QR, tìm khách theo tên hoặc số điện thoại, hoặc ghi nhận khách vãng lai ngay tại
          quầy.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <div role="tablist" aria-label="Cách tiếp nhận khách" className="flex flex-wrap gap-2">
          {(
            [
              ["QR", "Quét QR"],
              ["SEARCH", "Tìm khách"],
              ["WALK_IN", "Khách vãng lai"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                setMode(value);
                setError("");
                setMessage("");
              }}
              className={`min-h-10 rounded-lg border px-4 text-sm font-medium ${mode === value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "QR" && (
          <div className="space-y-4">
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
              <p>
                Tra cứu QR không tự check-in. Chỉ nút xác nhận ở cuối danh sách mới ghi nhận khách
                đã đến.
              </p>
            </div>
          </div>
        )}

        {mode === "SEARCH" && (
          <div className="space-y-4">
            <form onSubmit={findReceptionGuests} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                autoComplete="off"
                aria-label="Tìm khách theo tên hoặc số điện thoại"
                placeholder="Tên khách hoặc số điện thoại"
                className="h-12 min-w-0 flex-1"
                disabled={searchPending || checkInPending}
              />
              <Button
                type="submit"
                disabled={searchText.trim().length < 2 || searchPending || checkInPending}
                className="h-12 sm:min-w-36"
              >
                <Search aria-hidden="true" />
                {searchPending ? "Đang tìm…" : "Tìm khách"}
              </Button>
            </form>
            {searchResults.length > 0 && (
              <ul className="space-y-3" aria-label="Kết quả tìm khách">
                {searchResults.map((result) => (
                  <li
                    key={result.guestId}
                    className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold">
                        {result.honorific ? `${result.honorific} ` : ""}
                        {result.recipientName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {result.side} · {result.checkedIn}/{result.places} đã check-in ·{" "}
                        {result.tables.length ? result.tables.join(", ") : "Chưa xếp bàn"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => selectReceptionGuest(result)}
                      >
                        Chọn để check-in
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => startCompanionWalkIn(result)}
                      >
                        <UserPlus aria-hidden="true" />
                        Thêm người đi cùng
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {searchQuery && !searchPending && searchResults.length === 0 && (
              <div className="rounded-xl border border-dashed p-4 text-sm">
                <p>
                  Không tìm thấy khách phù hợp. Nếu đây là khách chưa có trong danh sách, có thể tạo
                  walk-in.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setWalkInGuestId(null);
                    setMode("WALK_IN");
                  }}
                >
                  Tạo khách vãng lai
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === "WALK_IN" && (
          <form onSubmit={submitWalkIn} className="space-y-4">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              Người được thêm sẽ được check-in ngay. Gửi lại cùng thông tin sau lỗi mạng sẽ dùng lại
              cùng khóa để không tạo trùng.
            </div>
            {walkInGuestId ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <p className="text-sm">
                  Thêm người đi cùng cho{" "}
                  <strong>
                    {searchResults.find((item) => item.guestId === walkInGuestId)?.recipientName ??
                      "khách đã chọn"}
                  </strong>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWalkInGuestId(null)}
                >
                  Tạo khách mới
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="font-medium">
                    Tên khách chính <span aria-hidden="true">*</span>
                  </span>
                  <Input
                    value={walkInName}
                    onChange={(event) => setWalkInName(event.target.value)}
                    maxLength={150}
                    required
                    placeholder="Họ tên khách vãng lai"
                    disabled={walkInPending}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Danh xưng</span>
                  <Input
                    value={walkInHonorific}
                    onChange={(event) => setWalkInHonorific(event.target.value)}
                    maxLength={50}
                    placeholder="Anh, Chị, Cô…"
                    disabled={walkInPending}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Nhóm/bên</span>
                  <select
                    value={walkInSide}
                    onChange={(event) =>
                      setWalkInSide(event.target.value as NonNullable<WalkInInput["side"]>)
                    }
                    disabled={walkInPending}
                    className="h-10 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="UNSPECIFIED">Chưa xác định</option>
                    <option value="BRIDE">Nhà gái</option>
                    <option value="GROOM">Nhà trai</option>
                    <option value="MUTUAL">Chung</option>
                  </select>
                </label>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">
                  {walkInGuestId ? "Số người đi cùng" : "Tổng số người"}
                </span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={walkInPeople}
                  onChange={(event) => setWalkInPeople(event.target.value)}
                  required
                  disabled={walkInPending}
                />
                <span className="block text-xs text-muted-foreground">
                  {walkInGuestId
                    ? "Tất cả người được thêm sẽ được check-in."
                    : "Tính cả khách chính; tối đa 20 người."}
                </span>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Tên người đi cùng</span>
                <textarea
                  value={walkInNames}
                  onChange={(event) => setWalkInNames(event.target.value)}
                  rows={3}
                  disabled={walkInPending}
                  placeholder="Mỗi người một dòng; có thể để trống"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Lý do nếu cần vượt sức chứa</span>
              <Input
                value={walkInReason}
                onChange={(event) => setWalkInReason(event.target.value)}
                maxLength={500}
                disabled={walkInPending}
                placeholder="Chỉ cần nhập khi quầy báo đã hết chỗ"
              />
            </label>
            <Button
              type="submit"
              className="h-12 w-full sm:w-auto"
              disabled={walkInPending || checkInPending}
            >
              <UserPlus aria-hidden="true" />
              {walkInPending
                ? "Đang thêm và check-in…"
                : walkInGuestId
                  ? "Thêm và check-in người đi cùng"
                  : "Tạo walk-in và check-in"}
            </Button>
          </form>
        )}
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
                {guest.honorific ? `${guest.honorific} ` : ""}
                {guest.recipientName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {guest.seats.length} người trong lời mời
              </p>
            </div>
          </div>

          {"published" in guest && !guest.published && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              Sơ đồ bàn chưa được công bố cho khách. Quầy đang hiển thị sơ đồ hiện tại của wedding.
            </p>
          )}

          <section aria-labelledby="checkin-people-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="checkin-people-heading" className="font-semibold">
                Từng người trong lời mời
              </h3>
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
              <span className="font-medium">
                Lý do check-in ngoại lệ <span aria-hidden="true">*</span>
              </span>
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
                    selectedIds.length === 0 ||
                    checkInPending ||
                    (selectedUnused && !exceptionReason.trim())
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
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
        >
          {message}
        </p>
      )}
    </section>
  );
}
