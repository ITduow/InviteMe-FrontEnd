"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { createMyRsvp, getMyRsvp, replaceMyRsvp, type Rsvp } from "../api/rsvp.api";

type Answer = "yes" | "no" | "";
type Row = { key: string; participantId?: string; name: string; answer: Answer; position?: number };

const attendanceLabel: Record<string, string> = {
  PENDING: "Chưa trả lời",
  ATTENDING: "Tham dự",
  DECLINED: "Không tham dự",
  WAITLISTED: "Chờ duyệt",
};

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

function guestError(error: unknown) {
  if (!(error instanceof ApiError)) return "Không gửi được câu trả lời. Vui lòng thử lại.";
  if (error.backendCode === "INVITATION_UNAVAILABLE") return "Liên kết thiệp không còn khả dụng.";
  if (error.backendCode === "INSUFFICIENT_SLOTS")
    return "Số chỗ còn lại không đủ cho câu trả lời này. Hãy giảm số người tham dự.";
  if (error.status === 409)
    return "Thiệp vừa được cập nhật ở thiết bị khác. Hãy tải lại câu trả lời mới nhất.";
  if (error.status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.";
  if (error.status === 400) return "Câu trả lời chưa hợp lệ. Hãy kiểm tra tên và số người tham dự.";
  return error.message;
}

export function GuestRsvp({ token }: { token: string }) {
  const { api } = useRuntime();
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["guest-rsvp", token],
    queryFn: ({ signal }) => getMyRsvp(api, token, signal),
    retry: false,
    staleTime: 0,
  });
  if (query.isPending) return <LoadingState label="Đang tải câu trả lời của bạn…" />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.backendCode === "INVITATION_UNAVAILABLE")
      return (
        <p className="rounded-xl bg-card p-6 text-center">
          Thiệp chưa được lưu hoặc liên kết không còn khả dụng.
        </p>
      );
    return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  }
  const rsvp = query.data;
  return (
    <RsvpForm
      key={`${rsvp.version}:${rsvp.pendingRequest?.id ?? "none"}`}
      token={token}
      rsvp={rsvp}
      refresh={() => void query.refetch()}
      notice={notice}
      setNotice={setNotice}
    />
  );
}

function RsvpForm({
  token,
  rsvp,
  refresh,
  notice,
  setNotice,
}: {
  token: string;
  rsvp: Rsvp;
  refresh: () => void;
  notice: string;
  setNotice: (message: string) => void;
}) {
  const { api } = useRuntime();
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
      setError("Hãy chọn Có hoặc Không cho từng người đã điền tên.");
      return;
    }
    if (selected.some((row) => !row.name.trim())) {
      setError("Hãy nhập tên cho người đi cùng được chọn tham dự.");
      return;
    }
    const plusOnes = selected.filter((row) => !row.participantId).map((row) => row.name.trim());
    if (plusOnes.length > 20) {
      setError("Một lần RSVP chỉ được thêm tối đa 20 người mới.");
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
      setNotice(
        result.queued
          ? "Đã gửi yêu cầu thay đổi. Cô dâu chú rể sẽ xem xét trước khi áp dụng."
          : "Đã lưu câu trả lời của bạn.",
      );
      refresh();
    } catch (cause) {
      setError(guestError(cause));
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
        ← Quay lại thiệp
      </Link>
      <header className="text-center">
        <h1 className="font-display text-3xl">Xác nhận tham dự</h1>
        <p className="mt-2 text-sm text-muted-foreground">Thiệp mời {rsvp.recipientName}</p>
      </header>
      <form
        onSubmit={(event) => void submit(event)}
        className="space-y-5 rounded-2xl bg-card p-5 shadow-sm sm:p-7"
      >
        <p className="rounded-lg bg-muted p-3 text-sm">
          Thiệp có {rsvp.places.length} chỗ mời · được xác nhận trực tiếp tối đa{" "}
          {rsvp.allowedPeople} người. Người đi thêm vượt mức này sẽ chờ cô dâu chú rể duyệt.
        </p>
        {rsvp.rsvpDeadline && (
          <p className="text-sm text-muted-foreground">
            Hạn xác nhận: {new Date(rsvp.rsvpDeadline).toLocaleString("vi-VN")}
          </p>
        )}
        {rsvp.locked && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            RSVP đã khóa hoặc quá hạn. Câu trả lời mới sẽ được gửi để chủ tiệc duyệt.
          </p>
        )}
        {rsvp.pendingRequest && (
          <p className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            Bạn đang có một yêu cầu thay đổi chờ duyệt. Số người xác nhận hiện tại chưa thay đổi.
          </p>
        )}
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.key} className="rounded-xl border bg-background p-3">
              <label className="block text-sm font-medium" htmlFor={`name-${row.key}`}>
                {row.position ? `${row.position}. ` : "+ "}
                {row.participantId
                  ? index === 0
                    ? "Người đại diện"
                    : "Người đi cùng"
                  : "Chỗ chưa có tên"}
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <input
                  id={`name-${row.key}`}
                  value={row.name}
                  readOnly={!!row.participantId}
                  onChange={(event) => changeRow(row.key, { name: event.target.value })}
                  maxLength={150}
                  placeholder="Nhập họ tên nếu tham dự"
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm read-only:bg-muted"
                />
                <div
                  className="flex gap-4 text-sm"
                  role="group"
                  aria-label={`Tham dự: ${row.name || `chỗ ${index + 1}`}`}
                >
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`answer-${row.key}`}
                      checked={row.answer === "yes"}
                      onChange={() => changeRow(row.key, { answer: "yes" })}
                    />
                    Có
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`answer-${row.key}`}
                      checked={row.answer === "no"}
                      onChange={() => changeRow(row.key, { answer: "no" })}
                    />
                    Không
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
                  Bỏ dòng này
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
          + Khai thêm người đi cùng
        </button>
        <p className="text-sm text-muted-foreground">
          Đang chọn {selected.length} người tham dự. Chỗ không dùng sẽ được để trống.
        </p>
        {rsvp.rsvpId && (
          <p className="text-sm">
            Trạng thái hiện tại: <strong>{attendanceLabel[rsvp.status]}</strong> ·{" "}
            {rsvp.confirmedPartySize} người đã xác nhận
            {rsvp.waitlistedPartySize ? ` · ${rsvp.waitlistedPartySize} người chờ duyệt` : ""}.
          </p>
        )}
        {waiting.length > 0 && (
          <p className="text-sm text-amber-900">
            Đang chờ duyệt: {waiting.map((person) => person.fullName).join(", ")}.
          </p>
        )}
        {rsvp.message && <p className="text-sm text-muted-foreground">{rsvp.message}</p>}
        <label className="block text-sm font-medium" htmlFor="rsvp-note">
          Ghi chú cho cô dâu chú rể (không bắt buộc)
        </label>
        <textarea
          id="rsvp-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={4}
          className="w-full rounded-md border bg-background p-3 text-sm"
          placeholder="Lời nhắn của bạn…"
        />
        {error && (
          <div role="alert" className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-900">
            <p>{error}</p>
            <button type="button" onClick={refresh} className="underline">
              Tải lại dữ liệu mới nhất
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
            ? "Đang gửi…"
            : rsvp.locked
              ? "Gửi yêu cầu thay đổi"
              : rsvp.rsvpId
                ? "Cập nhật xác nhận"
                : "Gửi xác nhận"}
        </Button>
      </form>
    </div>
  );
}
