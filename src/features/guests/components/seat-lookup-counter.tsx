"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
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
import { useLocale } from "@/i18n/language-context";
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
type CounterDisplayResult = {
  recipientName: string;
  honorific: string | null;
  places: CheckInResult["places"];
  walkIn: boolean;
  overCapacity: boolean;
};

const COUNTER_DISPLAY_SECONDS = 8;

function apiErrorMessage(
  error: unknown,
  action: "lookup" | "check-in" | "search" | "walk-in",
  t: (key: string) => string,
) {
  const actionKey = action.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
  if (!(error instanceof ApiError)) return t(`reception.errors.${actionKey}.network`);
  if (error.status === 403) return t("reception.errors.forbidden");
  if (error.status === 404) return t("reception.errors.notFound");
  if (error.status === 400)
    return action === "search"
      ? t("reception.errors.searchQuery")
      : t("reception.errors.invalidCode");
  if (error.status === 429) return t("reception.errors.rateLimited");
  if (error.backendCode === "CHECKIN_EXCEPTION_REASON_REQUIRED")
    return t("reception.errors.exceptionRequired");
  if (error.backendCode === "PLACE_NOT_IN_INVITATION") return t("reception.errors.placeChanged");
  if (error.backendCode === "WALK_IN_OVER_CAPACITY") return t("reception.errors.overCapacity");
  if (error.backendCode === "IDEMPOTENCY_KEY_REUSED")
    return t("reception.errors.idempotencyConflict");
  if (error.status === 422) return t("reception.errors.invalidState");
  return t(`reception.errors.${actionKey}.generic`);
}

function attendanceLabel(
  seat: SeatLookup["seats"][number],
  latestOutcome: CheckInOutcome | undefined,
  t: (key: string) => string,
) {
  if (latestOutcome === "CHECKED_IN") return t("reception.status.checkedIn");
  if (latestOutcome === "ALREADY_CHECKED_IN" || seat.checkedInAt)
    return t("reception.status.alreadyCheckedIn");
  return t("reception.status.notCheckedIn");
}

function friendlyTime(value: string, language: "vi" | "en") {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function SeatLookupCounter({ weddingId }: { weddingId: string }) {
  const { t } = useTranslation("guests");
  const { language } = useLocale();
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
  const [counterDisplay, setCounterDisplay] = useState<CounterDisplayResult | null>(null);
  const [returnCountdown, setReturnCountdown] = useState(COUNTER_DISPLAY_SECONDS);
  const [resumeCameraOnReturn, setResumeCameraOnReturn] = useState(false);
  const [autoStartCamera, setAutoStartCamera] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const displayHeading = useRef<HTMLHeadingElement>(null);
  const lookupBusy = useRef(false);

  const returnToScanner = useCallback(() => {
    setCounterDisplay(null);
    setReturnCountdown(COUNTER_DISPLAY_SECONDS);
    setMode("QR");
    setCode("");
    setLookupCode(null);
    setGuest(null);
    setSearchText("");
    setSearchQuery("");
    setSearchResults([]);
    setActiveSearchQuery(null);
    setWalkInGuestId(null);
    setSelectedIds([]);
    setOutcomes({});
    setExceptionReason("");
    setError("");
    setMessage("");
    setForbidden(false);
    setAutoStartCamera(resumeCameraOnReturn);
    setResumeCameraOnReturn(false);
    window.setTimeout(() => input.current?.focus(), 0);
  }, [resumeCameraOnReturn]);

  useEffect(() => {
    if (!counterDisplay) return;
    displayHeading.current?.focus();
    const countdown = window.setInterval(() => {
      setReturnCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    const returnTimer = window.setTimeout(returnToScanner, COUNTER_DISPLAY_SECONDS * 1000);
    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(returnTimer);
    };
  }, [counterDisplay, returnToScanner]);

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
      setError(t("reception.errors.codeTooLong"));
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
      setMessage(t("reception.lookupOnly"));
      setCode("");
    } catch (cause) {
      setError(apiErrorMessage(cause, "lookup", t));
      if (cause instanceof ApiError && cause.status === 403) setForbidden(true);
    } finally {
      lookupBusy.current = false;
      setLookupPending(false);
      input.current?.focus();
    }
  }

  function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResumeCameraOnReturn(false);
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
      setError(t("reception.errors.exceptionRequired"));
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
      setCounterDisplay({
        recipientName: result.recipientName,
        honorific: result.honorific,
        places: result.places,
        walkIn: false,
        overCapacity: false,
      });
      setReturnCountdown(COUNTER_DISPLAY_SECONDS);
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
          ? t("reception.checkInSummary", { newly: newlyChecked, already: alreadyDone })
          : t("reception.checkInSuccess", { count: newlyChecked }),
      );
    } catch (cause) {
      setError(apiErrorMessage(cause, "check-in", t));
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
          ? t("reception.searchResults", { count: result.length })
          : t("reception.noSearchResults"),
      );
    } catch (cause) {
      setError(apiErrorMessage(cause, "search", t));
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
    setMessage(t("reception.guestSelected"));
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
      setError(t("reception.errors.walkInCount"));
      return;
    }
    if (!walkInGuestId && !recipientName) {
      setError(t("reception.errors.walkInName"));
      return;
    }
    if (names.length > (walkInGuestId ? people : people - 1)) {
      setError(
        walkInGuestId
          ? t("reception.errors.companionNameCount")
          : t("reception.errors.walkInNameCount"),
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
      setCounterDisplay({
        recipientName: result.recipientName,
        honorific: result.honorific,
        places: result.places,
        walkIn: true,
        overCapacity: result.overCapacity,
      });
      setReturnCountdown(COUNTER_DISPLAY_SECONDS);
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
          ? t(
              result.overCapacity
                ? "reception.walkInCreatedOverCapacity"
                : "reception.walkInCreated",
              { count: result.places.length },
            )
          : t("reception.companionsAdded", { count: result.places.length }),
      );
    } catch (cause) {
      setError(apiErrorMessage(cause, "walk-in", t));
      if (cause instanceof ApiError && cause.status === 403) setForbidden(true);
    } finally {
      setWalkInPending(false);
    }
  }

  const selectedUnused =
    guest?.seats.some((seat) => selectedIds.includes(seat.placeId) && seat.status === "UNUSED") ??
    false;

  if (counterDisplay) {
    const newlyCheckedIn = counterDisplay.places.filter(
      (place) => place.result === "CHECKED_IN",
    ).length;
    const previouslyCheckedIn = counterDisplay.places.length - newlyCheckedIn;
    const allAlreadyCheckedIn = newlyCheckedIn === 0 && previouslyCheckedIn > 0;

    return (
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="counter-result-heading"
        className="fixed inset-0 z-[100] grid overflow-y-auto bg-slate-950 p-4 text-white sm:p-8"
      >
        <div className="m-auto w-full max-w-5xl space-y-6 text-center sm:space-y-8">
          <div
            className={`mx-auto grid size-20 place-items-center rounded-full sm:size-28 ${allAlreadyCheckedIn ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"}`}
          >
            {allAlreadyCheckedIn ? (
              <AlertCircle className="size-12 sm:size-16" aria-hidden="true" />
            ) : (
              <CircleCheck className="size-12 sm:size-16" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-3">
            <p
              className={`text-sm font-bold uppercase tracking-[0.2em] sm:text-lg ${allAlreadyCheckedIn ? "text-amber-300" : "text-emerald-300"}`}
            >
              {allAlreadyCheckedIn
                ? t("reception.resultAlreadyCheckedIn")
                : counterDisplay.walkIn
                  ? t("reception.resultWalkIn")
                  : t("reception.resultSuccess")}
            </p>
            <h1
              ref={displayHeading}
              id="counter-result-heading"
              tabIndex={-1}
              className="text-4xl font-bold leading-tight tracking-tight outline-none sm:text-6xl lg:text-7xl"
            >
              {counterDisplay.honorific ? `${counterDisplay.honorific} ` : ""}
              {counterDisplay.recipientName}
            </h1>
            <p className="text-lg text-slate-300 sm:text-2xl">
              {newlyCheckedIn > 0
                ? t("reception.resultCounts", {
                    newly: newlyCheckedIn,
                    already: previouslyCheckedIn,
                  })
                : t("reception.resultAlreadyCount", { count: previouslyCheckedIn })}
            </p>
          </div>

          <ul
            aria-label={t("reception.resultList")}
            className="mx-auto grid max-w-4xl gap-3 text-left sm:grid-cols-2"
          >
            {counterDisplay.places.map((place) => {
              const alreadyCheckedIn = place.result === "ALREADY_CHECKED_IN";
              return (
                <li
                  key={place.placeId}
                  className={`flex min-h-24 items-center justify-between gap-4 rounded-2xl border p-4 sm:min-h-28 sm:p-6 ${alreadyCheckedIn ? "border-amber-300/40 bg-amber-300/10" : "border-emerald-300/30 bg-white/5"}`}
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    {alreadyCheckedIn ? (
                      <AlertCircle
                        className="size-7 shrink-0 text-amber-300 sm:size-9"
                        aria-hidden="true"
                      />
                    ) : (
                      <CircleCheck
                        className="size-7 shrink-0 text-emerald-300 sm:size-9"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="break-words text-xl font-semibold sm:text-3xl">
                        {place.personName ?? t("guestNumber", { number: place.position })}
                      </p>
                      <p className="mt-1 text-sm text-slate-300 sm:text-base">
                        {alreadyCheckedIn
                          ? t("reception.status.alreadyCheckedIn")
                          : t("reception.status.justCheckedIn")}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs uppercase tracking-wider text-slate-400 sm:text-sm">
                      {t("reception.tableNumber")}
                    </p>
                    <p className="mt-1 text-2xl font-bold sm:text-4xl">
                      {place.table ?? t("reception.notAssigned")}
                    </p>
                    {place.table && place.seatNumber !== null && (
                      <p className="text-sm text-slate-300 sm:text-base">
                        {t("reception.seatNumber", { number: place.seatNumber })}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {counterDisplay.overCapacity && (
            <p className="mx-auto max-w-3xl rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-100 sm:text-base">
              {t("reception.overCapacityAccepted")}
            </p>
          )}

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={returnToScanner}
              className="h-14 min-w-64 bg-white px-8 text-lg font-semibold text-slate-950 hover:bg-slate-200"
            >
              {t("reception.nextGuest")}
            </Button>
            <p aria-live="off" className="text-sm text-slate-400">
              {t("reception.returnCountdown", { count: returnCountdown })}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 pb-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{t("reception.checkInLabel")}</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{t("reception.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("reception.description")}</p>
      </header>

      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <div role="tablist" aria-label={t("reception.modesLabel")} className="flex flex-wrap gap-2">
          {(
            [
              ["QR", t("reception.scanQr")],
              ["SEARCH", t("reception.searchGuest")],
              ["WALK_IN", t("reception.walkIn")],
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
                setResumeCameraOnReturn(false);
                setAutoStartCamera(false);
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
              autoStart={autoStartCamera}
              onDetected={(value) => {
                setResumeCameraOnReturn(true);
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
                aria-label={t("reception.codeLabel")}
                placeholder={t("reception.codePlaceholder")}
                className="h-12 min-w-0 flex-1"
                disabled={lookupPending || checkInPending}
              />
              <Button
                type="submit"
                disabled={!code.trim() || lookupPending || checkInPending}
                className="h-12 sm:min-w-36"
              >
                <Search aria-hidden="true" />
                {lookupPending ? t("reception.lookupPending") : t("reception.lookup")}
              </Button>
            </form>
            <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{t("reception.lookupHint")}</p>
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
                aria-label={t("reception.searchLabel")}
                placeholder={t("reception.searchPlaceholder")}
                className="h-12 min-w-0 flex-1"
                disabled={searchPending || checkInPending}
              />
              <Button
                type="submit"
                disabled={searchText.trim().length < 2 || searchPending || checkInPending}
                className="h-12 sm:min-w-36"
              >
                <Search aria-hidden="true" />
                {searchPending ? t("reception.searching") : t("reception.search")}
              </Button>
            </form>
            {searchResults.length > 0 && (
              <ul className="space-y-3" aria-label={t("reception.searchResultsLabel")}>
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
                        {t(`planning.sideValues.${result.side}`, { defaultValue: result.side })} ·{" "}
                        {t("reception.checkedInOfPlaces", {
                          checkedIn: result.checkedIn,
                          places: result.places,
                        })}{" "}
                        ·{" "}
                        {result.tables.length
                          ? result.tables.join(", ")
                          : t("reception.notAssigned")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => selectReceptionGuest(result)}
                      >
                        {t("reception.selectForCheckIn")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => startCompanionWalkIn(result)}
                      >
                        <UserPlus aria-hidden="true" />
                        {t("reception.addCompanion")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {searchQuery && !searchPending && searchResults.length === 0 && (
              <div className="rounded-xl border border-dashed p-4 text-sm">
                <p>{t("reception.noSearchMatchHint")}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setWalkInGuestId(null);
                    setMode("WALK_IN");
                  }}
                >
                  {t("reception.createWalkIn")}
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === "WALK_IN" && (
          <form onSubmit={submitWalkIn} className="space-y-4">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              {t("reception.walkInHint")}
            </div>
            {walkInGuestId ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <p className="text-sm">
                  {t("reception.addCompanionFor")}{" "}
                  <strong>
                    {searchResults.find((item) => item.guestId === walkInGuestId)?.recipientName ??
                      t("reception.selectedGuest")}
                  </strong>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWalkInGuestId(null)}
                >
                  {t("reception.createNewGuest")}
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="font-medium">
                    {t("reception.primaryGuestName")} <span aria-hidden="true">*</span>
                  </span>
                  <Input
                    value={walkInName}
                    onChange={(event) => setWalkInName(event.target.value)}
                    maxLength={150}
                    required
                    placeholder={t("reception.walkInNamePlaceholder")}
                    disabled={walkInPending}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">{t("reception.honorific")}</span>
                  <Input
                    value={walkInHonorific}
                    onChange={(event) => setWalkInHonorific(event.target.value)}
                    maxLength={50}
                    placeholder={t("reception.honorificPlaceholder")}
                    disabled={walkInPending}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium">{t("reception.sideGroup")}</span>
                  <select
                    value={walkInSide}
                    onChange={(event) =>
                      setWalkInSide(event.target.value as NonNullable<WalkInInput["side"]>)
                    }
                    disabled={walkInPending}
                    className="h-10 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="UNSPECIFIED">{t("planning.sideValues.UNSPECIFIED")}</option>
                    <option value="BRIDE">{t("planning.sideValues.BRIDE")}</option>
                    <option value="GROOM">{t("planning.sideValues.GROOM")}</option>
                    <option value="MUTUAL">{t("planning.sideValues.MUTUAL")}</option>
                  </select>
                </label>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">
                  {walkInGuestId ? t("reception.companionCount") : t("reception.totalPeople")}
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
                    ? t("reception.allCompanionsCheckedIn")
                    : t("reception.totalPeopleHint")}
                </span>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">{t("reception.companionNames")}</span>
                <textarea
                  value={walkInNames}
                  onChange={(event) => setWalkInNames(event.target.value)}
                  rows={3}
                  disabled={walkInPending}
                  placeholder={t("reception.companionNamesPlaceholder")}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t("reception.capacityOverrideReason")}</span>
              <Input
                value={walkInReason}
                onChange={(event) => setWalkInReason(event.target.value)}
                maxLength={500}
                disabled={walkInPending}
                placeholder={t("reception.capacityOverridePlaceholder")}
              />
            </label>
            <Button
              type="submit"
              className="h-12 w-full sm:w-auto"
              disabled={walkInPending || checkInPending}
            >
              <UserPlus aria-hidden="true" />
              {walkInPending
                ? t("reception.creatingAndCheckingIn")
                : walkInGuestId
                  ? t("reception.addAndCheckInCompanions")
                  : t("reception.createAndCheckInWalkIn")}
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
          {forbidden && <p className="mt-1">{t("reception.checkInPermissionRequired")}</p>}
        </div>
      )}

      {guest && (
        <article className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-foreground">
              <UserRound aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("reception.guestLabel")}</p>
              <h2 className="break-words text-xl font-semibold sm:text-2xl">
                {guest.honorific ? `${guest.honorific} ` : ""}
                {guest.recipientName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("reception.peopleInvited", { count: guest.seats.length })}
              </p>
            </div>
          </div>

          {"published" in guest && !guest.published && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              {t("reception.seatingNotPublishedCounter")}
            </p>
          )}

          <section aria-labelledby="checkin-people-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="checkin-people-heading" className="font-semibold">
                {t("reception.eachInvitedPerson")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("reception.selectedCount", { count: selectedIds.length })}
              </p>
            </div>
            {guest.seats.length === 0 ? (
              <p className="mt-3 rounded-lg border p-4 text-sm text-muted-foreground">
                {t("reception.noPlacesToCheckIn")}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {guest.seats.map((seat) => {
                  const outcome = outcomes[seat.placeId];
                  const checkedIn = Boolean(seat.checkedInAt) || outcome !== undefined;
                  const statusText = attendanceLabel(seat, outcome, t);
                  return (
                    <li key={seat.placeId} className="rounded-xl border p-4">
                      <label className="flex min-h-11 items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-5 accent-primary"
                          checked={selectedIds.includes(seat.placeId)}
                          onChange={(event) => togglePlace(seat.placeId, event.target.checked)}
                          disabled={checkedIn || checkInPending}
                          aria-label={t("reception.selectPersonForCheckIn", {
                            name: seat.personName ?? t("guestNumber", { number: seat.position }),
                          })}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            {seat.personName ?? t("guestNumber", { number: seat.position })}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {seat.table
                              ? `${t("reception.tableLabel")} ${seat.table}${seat.seatNumber !== null ? ` · ${t("reception.seatNumber", { number: seat.seatNumber })}` : ""}`
                              : t("reception.notAssigned")}
                            {` · ${t(`reception.attendance.${seat.status}`)}`}
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
                        {seat.checkedInAt &&
                          !outcome &&
                          ` · ${friendlyTime(seat.checkedInAt, language)}`}
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
                {t("reception.exceptionReasonLabel")} <span aria-hidden="true">*</span>
              </span>
              <span className="block text-muted-foreground">
                {t("reception.exceptionReasonHint")}
              </span>
              <Input
                value={exceptionReason}
                onChange={(event) => setExceptionReason(event.target.value)}
                maxLength={500}
                placeholder={t("reception.exceptionReasonPlaceholder")}
                aria-required="true"
                disabled={checkInPending}
              />
            </label>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("reception.confirmationHint")}</p>
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
                  {checkInPending
                    ? t("reception.recording")
                    : t("reception.confirmCheckInCount", { count: selectedIds.length })}
                </Button>
              }
              title={t("reception.confirmTitle")}
              description={t("reception.confirmDescription", { count: selectedIds.length })}
              cancelLabel={t("reception.goBack")}
              confirmLabel={t("reception.recordCheckIn")}
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
