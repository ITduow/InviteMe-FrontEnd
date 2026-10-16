"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import type { SeatingParty } from "../utils/seating-demo";
import { recipientLabel } from "../utils/seating-demo";
import {
  attendanceLabels,
  personRoleLabels,
  type AttendanceStatus,
  type SeatPerson,
} from "../utils/seating-attendance";

export function RsvpBadge({ person }: { person?: SeatPerson }) {
  const tone =
    person?.attendanceStatus === "ATTENDING"
      ? "bg-emerald-100 text-emerald-900"
      : person?.attendanceStatus === "DECLINED"
        ? "bg-rose-100 text-rose-900"
        : person?.attendanceStatus === "WAITLISTED"
          ? "bg-amber-100 text-amber-900"
          : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] ${tone}`}>
      {person ? attendanceLabels[person.attendanceStatus] : "Chưa có tên"}
    </span>
  );
}

export function SeatingPersonDetails({
  party,
  person,
  table,
  seat,
  onSave,
}: {
  party: SeatingParty;
  person?: SeatPerson;
  table: number | null | undefined;
  seat: number | undefined;
  onSave: (input: Omit<SeatPerson, "id">) => string | null;
}) {
  const [name, setName] = useState(person?.fullName ?? "");
  const [type, setType] = useState<SeatPerson["type"]>(person?.type ?? "OTHER");
  const [attendance, setAttendance] = useState<AttendanceStatus>(
    person?.attendanceStatus ?? "PENDING",
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          {table === null || table === undefined
            ? "Chưa xếp bàn"
            : `Bàn ${table + 1}${seat !== undefined ? ` · Ghế ${seat}` : ""}`}
        </p>
        <h2 className="mt-2 break-words font-serif text-xl">
          {person?.fullName || "Chỗ dự kiến chưa có tên"}
        </h2>
        <div className="mt-2">
          <RsvpBadge person={person} />
        </div>
      </div>
      <dl className="space-y-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Thuộc nhóm nhận thiệp</dt>
          <dd className="mt-1">{recipientLabel(party)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Nhóm khách</dt>
          <dd className="mt-1">{party.group}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Phía khách mời</dt>
          <dd className="mt-1">{party.side || "Chưa xác định"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Vai trò</dt>
          <dd className="mt-1">{person ? personRoleLabels[person.type] : "Chưa khai báo"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Liên hệ người đại diện</dt>
          <dd className="mt-1">{party.phone || "Chưa có SĐT"}</dd>
        </div>
      </dl>
      {!person && (
        <p className="rounded-lg border border-dashed p-3 text-xs leading-5 text-muted-foreground">
          Chỗ được giữ cho nhóm, chưa có hồ sơ người ngồi. Bổ sung tên rồi mới cập nhật RSVP; xác
          nhận của đại diện không xác nhận thay chỗ này.
        </p>
      )}
      {person?.attendanceStatus === "DECLINED" && (
        <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-900">
          Người này đã từ chối nhưng vẫn đang giữ chỗ. Bạn có thể chuyển về danh sách chưa xếp.
        </p>
      )}
      <details className="border-t pt-4" open={!person}>
        <summary className="cursor-pointer text-sm font-medium">
          {person ? "Thử sửa thông tin / RSVP" : "Bổ sung người cho chỗ này"}
        </summary>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const message = onSave({ fullName: name, type, attendanceStatus: attendance });
            setError(message ?? "");
            setSaved(!message);
          }}
        >
          <p className="text-xs leading-5 text-muted-foreground">
            Chỉ cập nhật bản thử trên thiết bị. Không gửi phản hồi RSVP thật.
          </p>
          <label className="block space-y-1 text-xs">
            <span>Họ tên người ngồi</span>
            <input
              required
              maxLength={150}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span>Vai trò thành viên</span>
            <select
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={type}
              disabled={person?.type === "PRIMARY"}
              onChange={(e) => {
                setType(e.target.value as SeatPerson["type"]);
                setSaved(false);
              }}
            >
              {Object.entries(personRoleLabels)
                .filter(([key]) => key !== "PRIMARY" || person?.type === "PRIMARY")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs">
            <span>Trạng thái RSVP (thử)</span>
            <select
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={attendance}
              onChange={(e) => {
                setAttendance(e.target.value as AttendanceStatus);
                setSaved(false);
              }}
            >
              {Object.entries(attendanceLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-xs text-emerald-800">
              Đã cập nhật trong bản thử.
            </p>
          )}
          <Button type="submit" className="w-full">
            Cập nhật bản thử
          </Button>
        </form>
      </details>
    </div>
  );
}
