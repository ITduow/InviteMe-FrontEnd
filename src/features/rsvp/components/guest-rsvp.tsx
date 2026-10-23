"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { createMyRsvp, getMyRsvp, replaceMyRsvp, type Rsvp } from "../api/rsvp.api";
import { getGuestSeats } from "../api/guest-seats.api";
import { useLocale } from "@/i18n/language-context";
import { formatDate } from "@/i18n/format";

type Answer = "yes" | "no" | "";
type Row = { key: string; participantId?: string; name: string; answer: Answer; position?: number };

function initialRows(rsvp: Rsvp): Row[] {
  const people = new Map(rsvp.participants.map((person) => [person.id, person]));
  const assigned = new Set<string>();
  const rows: Row[] = rsvp.places.map((place) => {
    const person = place.participantId ? people.get(place.participantId) : undefined;
    if (person) assigned.add(person.id);
    return {
      key: place.id,
      participantId: person?.id,
      name: person?.fullName ?? "",
      answer: (rsvp.rsvpId && person
        ? person.attendanceStatus === "ATTENDING"
          ? "yes"
          : person.attendanceStatus === "DECLINED"
            ? "no"
            : ""
        : "") as Answer,
      position: place.position,
    };
  });
  for (const person of rsvp.participants) {
    if (assigned.has(person.id)) continue;
    rows.push({
      key: person.id,
      participantId: person.id,
      name: person.fullName,
      answer:
        person.attendanceStatus === "DECLINED"
          ? "no"
          : person.attendanceStatus === "PENDING"
            ? ""
            : "yes",
    });
  }
  return rows;
}

function guestError(error: unknown, t: (key: string) => string) {
  if (!(error instanceof ApiError)) return t("rsvp.errors.generic");
  if (error.backendCode === "INVITATION_UNAVAILABLE") return t("rsvp.errors.invitationUnavailable");
  if (error.backendCode === "INSUFFICIENT_SLOTS") return t("rsvp.errors.insufficientSlots");
  if (error.status === 409) return t("rsvp.errors.conflict");
  if (error.status === 429) return t("rsvp.errors.tooManyRequests");
  if (error.status === 400) return t("rsvp.errors.invalidAnswer");
  return t("rsvp.errors.generic");
}

export function GuestRsvp({ token }: { token: string }) {
  const { t } = useTranslation("guests");
  const { api } = useRuntime();
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["guest-rsvp", token],
    queryFn: ({ signal }) => getMyRsvp(api, token, signal),
    retry: false,
    staleTime: 0,
  });
  const seats = useQuery({
    queryKey: ["guest-seats", token],
    queryFn: ({ signal }) => getGuestSeats(api, token, signal),
  });
  if (query.isPending) return <LoadingState label={t("rsvp.loading")} />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.backendCode === "INVITATION_UNAVAILABLE")
      return <p className="rounded-xl bg-card p-6 text-center">{t("rsvp.unavailable")}</p>;
    return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  }
  const rsvp = query.data;
  return (
    <div className="space-y-5">
      <RsvpForm
        key={`${rsvp.version}:${rsvp.pendingRequest?.id ?? "none"}`}
        token={token}
        rsvp={rsvp}
        refresh={() => void query.refetch()}
        notice={notice}
        setNotice={setNotice}
        t={t}
      />
      {seats.data?.published && (
        <section className="rounded-2xl bg-card p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-semibold">{t("yourTable")}</h2>
          <div className="mt-3 space-y-2">
            {seats.data.seats
              .filter((seat) => seat.status !== "UNUSED")
              .map((seat) => (
                <p key={seat.position} className="rounded-lg border p-3 text-sm">
                  {seat.personName ?? t("guestNumber", { number: seat.position })} ·{" "}
                  {seat.table
                    ? `${seat.table}${seat.seatNumber ? `, ${t("seatNumber", { number: seat.seatNumber })}` : ""}`
                    : t("notAssigned")}
                </p>
              ))}
            {seats.data.seats.every((seat) => seat.status === "UNUSED") && (
              <p className="text-sm text-muted-foreground">{t("noSeatYet")}</p>
            )}
          </div>
        </section>
      )}
      {seats.data && !seats.data.published && (
        <p className="text-center text-sm text-muted-foreground">{t("rsvp.seatingNotPublished")}</p>
      )}
    </div>
  );
}

function RsvpForm({
  token,
  rsvp,
  refresh,
  notice,
  setNotice,
  t,
}: {
  token: string;
  rsvp: Rsvp;
  refresh: () => void;
  notice: string;
  setNotice: (message: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const { api } = useRuntime();
  const { language } = useLocale();
  const cache = useQueryClient();
  const [rows, setRows] = useState(() => initialRows(rsvp));
  const [note, setNote] = useState(rsvp.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [nextExtra, setNextExtra] = useState(0);
  const selected = rows.filter((row) => row.answer === "yes");
  const waiting = rsvp.participants.filter((person) => person.attendanceStatus === "WAITLISTED");

  function changeRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (rows.some((row) => row.name.trim() && !row.answer)) {
      setError(t("rsvp.errors.answerEach"));
      return;
    }
    if (selected.some((row) => !row.name.trim())) {
      setError(t("rsvp.errors.plusOneName"));
      return;
    }
    const plusOnes = selected.filter((row) => !row.participantId).map((row) => row.name.trim());
    if (plusOnes.length > 20) {
      setError(t("rsvp.errors.maxPlusOnes"));
      return;
    }
    setSaving(true);
    try {
      const input = {
        expectedVersion: rsvp.version,
        decision: selected.length ? ("ATTENDING" as const) : ("DECLINED" as const),
        participantIds: selected.flatMap((row) => (row.participantId ? [row.participantId] : [])),
        plusOnes,
        note: note.trim(),
      };
      const result = rsvp.rsvpId
        ? await replaceMyRsvp(api, token, input)
        : await createMyRsvp(api, token, input);
      cache.setQueryData(["guest-rsvp", token], result.rsvp);
      void cache.invalidateQueries({ queryKey: ["guest-seats", token] });
      setNotice(result.queued ? t("rsvp.changeRequestSent") : t("rsvp.answerSaved"));
      refresh();
    } catch (cause) {
      setError(guestError(cause, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/invite/${encodeURIComponent(token)}`}
        className="text-sm underline underline-offset-4"
      >
        {t("rsvp.backToInvitation")}
      </Link>
      <header className="text-center">
        <h1 className="font-display text-3xl">{t("rsvp.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("rsvp.invitationFor", { name: rsvp.recipientName })}
        </p>
      </header>
      <form
        onSubmit={(event) => void submit(event)}
        className="space-y-5 rounded-2xl bg-card p-5 shadow-sm sm:p-7"
      >
        <p className="rounded-lg bg-muted p-3 text-sm">
          {t("rsvp.capacityHint", { places: rsvp.places.length, allowed: rsvp.allowedPeople })}
        </p>
        {rsvp.rsvpDeadline && (
          <p className="text-sm text-muted-foreground">
            {t("rsvp.deadline", {
              date: formatDate(rsvp.rsvpDeadline, language, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}
          </p>
        )}
        {rsvp.locked && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {t("rsvp.lockedHint")}
          </p>
        )}
        {rsvp.pendingRequest && (
          <p className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            {t("rsvp.pendingChangeHint")}
          </p>
        )}
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-xl border bg-background p-3">
              <label className="block text-sm font-medium" htmlFor={`name-${row.key}`}>
                {row.position ? `${row.position}. ` : "+ "}
                {row.participantId
                  ? index === 0
                    ? t("rsvp.primaryGuest")
                    : t("rsvp.plusOne")
                  : t("rsvp.unnamedPlace")}
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <input
                  id={`name-${row.key}`}
                  value={row.name}
                  readOnly={!!row.participantId}
                  onChange={(event) => changeRow(row.key, { name: event.target.value })}
                  maxLength={150}
                  placeholder={t("rsvp.namePlaceholder")}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm read-only:bg-muted"
                />
                <div
                  className="flex gap-4 text-sm"
                  role="group"
                  aria-label={t("rsvp.attendanceAria", {
                    name: row.name || t("rsvp.placeNumber", { number: index + 1 }),
                  })}
                >
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`answer-${row.key}`}
                      checked={row.answer === "yes"}
                      onChange={() => changeRow(row.key, { answer: "yes" })}
                    />
                    {t("rsvp.yes")}
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`answer-${row.key}`}
                      checked={row.answer === "no"}
                      onChange={() => changeRow(row.key, { answer: "no" })}
                    />
                    {t("rsvp.no")}
                  </label>
                </div>
              </div>
              {!row.position && !row.participantId && (
                <button
                  type="button"
                  onClick={() =>
                    setRows((current) => current.filter((item) => item.key !== row.key))
                  }
                  className="mt-2 text-xs underline"
                >
                  {t("rsvp.removeRow")}
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="text-sm font-medium underline underline-offset-4"
          onClick={() => {
            const key = `extra-${nextExtra}`;
            setNextExtra((value) => value + 1);
            setRows((current) => [...current, { key, name: "", answer: "", position: undefined }]);
          }}
        >
          + {t("rsvp.addPlusOne")}
        </button>
        <p className="text-sm text-muted-foreground">
          {t("rsvp.selectedCount", { count: selected.length })}
        </p>
        {rsvp.rsvpId && (
          <p className="text-sm">
            {t("rsvp.currentStatus")}: <strong>{t(`rsvp.status.${rsvp.status}`)}</strong> ·{" "}
            {t("rsvp.confirmedCount", { count: rsvp.confirmedPartySize })}
            {rsvp.waitlistedPartySize
              ? ` · ${t("rsvp.waitlistedCount", { count: rsvp.waitlistedPartySize })}`
              : ""}
            .
          </p>
        )}
        {waiting.length > 0 && (
          <p className="text-sm text-amber-900">
            {t("rsvp.awaitingApproval", {
              names: waiting.map((person) => person.fullName).join(", "),
            })}
          </p>
        )}
        {rsvp.message && <p className="text-sm text-muted-foreground">{rsvp.message}</p>}
        <label className="block text-sm font-medium" htmlFor="rsvp-note">
          {t("rsvp.noteLabel")}
        </label>
        <textarea
          id="rsvp-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={4}
          className="w-full rounded-md border bg-background p-3 text-sm"
          placeholder={t("rsvp.notePlaceholder")}
        />
        {error && (
          <div role="alert" className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-900">
            <p>{error}</p>
            <button type="button" onClick={refresh} className="underline">
              {t("rsvp.reloadLatest")}
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
            {notice}
          </p>
        )}
        <Button type="submit" disabled={saving} className="w-full">
          {saving
            ? t("rsvp.sending")
            : rsvp.locked
              ? t("rsvp.requestChange")
              : rsvp.rsvpId
                ? t("rsvp.updateAnswer")
                : t("rsvp.submitAnswer")}
        </Button>
      </form>
    </div>
  );
}
