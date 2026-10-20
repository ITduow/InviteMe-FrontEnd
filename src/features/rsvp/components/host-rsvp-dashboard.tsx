"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import {
  exportRsvpGuests,
  getHostRsvp,
  getRsvpDashboard,
  getRsvpSettings,
  hostRsvpKeys,
  listRsvpGuests,
  lockRsvps,
  saveHostRsvp,
  saveRsvpSettings,
  type RsvpGuestRow,
  type RsvpListStatus,
  type RsvpSettings,
} from "../api/host-rsvp.api";

const statusOptions: { value: RsvpListStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "NOT_RESPONDED", label: "Chưa trả lời" },
  { value: "ATTENDING", label: "Tham dự" },
  { value: "DECLINED", label: "Không tham dự" },
  { value: "WAITING", label: "Có người chờ duyệt" },
  { value: "PENDING_REQUEST", label: "Có yêu cầu thay đổi" },
];
const statusLabel = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]));
const fieldClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm";

function message(error: unknown) {
  if (error instanceof ApiError) {
    if (error.backendCode === "CONCURRENCY_CONFLICT")
      return "Dữ liệu vừa thay đổi. Hãy tải lại rồi thử lại.";
    if (error.backendCode === "INSUFFICIENT_SLOTS")
      return "Sức chứa còn lại không đủ cho số người này.";
    if (error.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    return error.message;
  }
  return "Không hoàn tất được thao tác. Vui lòng thử lại.";
}

export function HostRsvpDashboard({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const cache = useQueryClient();
  const { can } = usePermission();
  const [status, setStatus] = useState<RsvpListStatus | "">("");
  const [search, setSearch] = useState("");
  const [side, setSide] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RsvpGuestRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState("");
  const filters = {
    status: status || undefined,
    search,
    side: side || undefined,
    page,
    pageSize: 25,
  };
  const summary = useQuery({
    queryKey: hostRsvpKeys.dashboard(weddingId, side || undefined),
    queryFn: ({ signal }) => getRsvpDashboard(api, weddingId, side || undefined, undefined, signal),
  });
  const guests = useQuery({
    queryKey: hostRsvpKeys.guests(weddingId, filters),
    queryFn: ({ signal }) => listRsvpGuests(api, weddingId, filters, signal),
  });
  const settings = useQuery({
    queryKey: hostRsvpKeys.settings(weddingId),
    queryFn: ({ signal }) => getRsvpSettings(api, weddingId, signal),
  });

  async function download() {
    setActionError("");
    setExporting(true);
    try {
      const blob = await exportRsvpGuests(api, weddingId, {
        status: status || undefined,
        search,
        side: side || undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "rsvp.csv";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setActionError(message(error));
    } finally {
      setExporting(false);
    }
  }

  const stats = summary.data;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Xác nhận tham dự"
        description="Theo dõi câu trả lời và số chỗ của từng thiệp."
        action={
          <Button variant="outline" disabled={exporting} onClick={() => void download()}>
            {exporting ? "Đang xuất…" : "Xuất CSV"}
          </Button>
        }
      />
      {actionError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
          {actionError}
        </p>
      )}
      {summary.isPending && <LoadingState label="Đang tải số liệu RSVP…" />}
      {summary.isError && <ErrorState error={summary.error} retry={() => void summary.refetch()} />}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Thiệp đã trả lời", `${stats.invitations.responded}/${stats.invitations.invited}`],
            ["Người xác nhận đi", String(stats.people.confirmed)],
            [
              "Sức chứa còn lại",
              stats.capacity.remaining === null
                ? "Chưa giới hạn"
                : String(stats.capacity.remaining),
            ],
            ["Đang chờ xử lý", String(stats.pendingRequests + stats.people.waitlisted)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <strong className="mt-2 block text-3xl">{value}</strong>
            </div>
          ))}
          <p className="col-span-full text-sm text-muted-foreground">
            {stats.invitations.notResponded} thiệp chưa trả lời · {stats.invitations.declined} thiệp
            từ chối · {stats.lockedGuests} thiệp bị khóa
          </p>
        </div>
      )}
      {settings.data && (
        <SettingsEditor
          key={settings.data.version}
          weddingId={weddingId}
          settings={settings.data}
          editable={can("GUEST_EDIT")}
        />
      )}
      {settings.isError && (
        <ErrorState error={settings.error} retry={() => void settings.refetch()} />
      )}
      <section className="space-y-4">
        <h2 className="font-display text-2xl">Danh sách thiệp</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className={fieldClass}
            aria-label="Tìm khách"
            placeholder="Tìm theo tên khách…"
            value={search}
            maxLength={100}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <select
            className={fieldClass}
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as RsvpListStatus | "");
              setPage(1);
            }}
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            aria-label="Lọc bên"
            value={side}
            onChange={(event) => {
              setSide(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Hai bên</option>
            <option value="BRIDE">Nhà gái</option>
            <option value="GROOM">Nhà trai</option>
            <option value="MUTUAL">Chung</option>
            <option value="UNSPECIFIED">Chưa phân bên</option>
          </select>
        </div>
        {guests.isPending && <LoadingState label="Đang tải danh sách thiệp…" />}
        {guests.isError && <ErrorState error={guests.error} retry={() => void guests.refetch()} />}
        {guests.data && (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3">Người nhận</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Đã đi / chỗ mời</th>
                    <th className="p-3">Chờ</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.data.items.map((guest) => (
                    <tr key={guest.guestId} className="border-t">
                      <td className="p-3 font-medium">
                        {guest.recipientName}
                        {guest.groupName && (
                          <small className="block text-muted-foreground">{guest.groupName}</small>
                        )}
                      </td>
                      <td className="p-3">
                        {statusLabel[guest.rsvpStatus] ?? guest.rsvpStatus}
                        {guest.pendingRequest && (
                          <small className="block text-amber-800">Có yêu cầu sửa</small>
                        )}
                      </td>
                      <td className="p-3">
                        {guest.confirmedPeople} / {guest.invitedPlaces}
                      </td>
                      <td className="p-3">{guest.waitlistedPeople}</td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => setSelected(guest)}>
                          Xem RSVP
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {guests.data.items.length === 0 && (
                <p className="p-6 text-center text-muted-foreground">Không có thiệp phù hợp.</p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{guests.data.totalItems} thiệp</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Trước
                </Button>
                <span className="self-center">Trang {page}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * 25 >= guests.data.totalItems}
                  onClick={() => setPage(page + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      {selected && (
        <HostRsvpDetail
          key={selected.guestId}
          weddingId={weddingId}
          guest={selected}
          editable={can("GUEST_EDIT")}
          close={() => {
            setSelected(null);
            void cache.invalidateQueries({ queryKey: hostRsvpKeys.all(weddingId) });
          }}
        />
      )}
    </div>
  );
}

function SettingsEditor({
  weddingId,
  settings,
  editable,
}: {
  weddingId: string;
  settings: RsvpSettings;
  editable: boolean;
}) {
  const { api } = useRuntime();
  const cache = useQueryClient();
  const [limit, setLimit] = useState(settings.plusOneLimit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="space-y-3 rounded-xl border bg-card p-5">
      <h2 className="font-display text-xl">Quy tắc RSVP</h2>
      <p className="text-sm">
        Hạn xác nhận:{" "}
        {settings.rsvpDeadline
          ? new Date(settings.rsvpDeadline).toLocaleString("vi-VN")
          : "Chưa đặt"}
        . Thay đổi hạn chót trong Wedding Setup.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          void saveRsvpSettings(api, weddingId, settings.version, limit)
            .then(() => cache.invalidateQueries({ queryKey: hostRsvpKeys.all(weddingId) }))
            .catch((cause) => setError(message(cause)))
            .finally(() => setSaving(false));
        }}
      >
        <label className="text-sm">
          Số người đi kèm tối đa mỗi thiệp
          <input
            className={`${fieldClass} mt-1 w-44`}
            type="number"
            min={0}
            max={20}
            value={limit}
            disabled={!editable}
            onChange={(event) => setLimit(Number(event.target.value))}
          />
        </label>
        {editable && (
          <Button disabled={saving || limit === settings.plusOneLimit} type="submit">
            Lưu giới hạn
          </Button>
        )}
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}

function HostRsvpDetail({
  weddingId,
  guest,
  editable,
  close,
}: {
  weddingId: string;
  guest: RsvpGuestRow;
  editable: boolean;
  close: () => void;
}) {
  const { api } = useRuntime();
  const cache = useQueryClient();
  const detail = useQuery({
    queryKey: hostRsvpKeys.detail(weddingId, guest.guestId),
    queryFn: ({ signal }) => getHostRsvp(api, weddingId, guest.guestId, signal),
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  async function setLock(locked: boolean, group = false) {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const result = await lockRsvps(
        api,
        weddingId,
        locked,
        group ? undefined : [guest.guestId],
        group ? (guest.groupId ?? undefined) : undefined,
      );
      setNotice(`Đã ${locked ? "khóa" : "mở khóa"} ${result.affected} thiệp.`);
      await cache.invalidateQueries({ queryKey: hostRsvpKeys.all(weddingId) });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-5"
      aria-label={`RSVP của ${guest.recipientName}`}
    >
      <div className="flex justify-between gap-3">
        <h2 className="font-display text-2xl">{guest.recipientName}</h2>
        <Button variant="ghost" onClick={close}>
          Đóng
        </Button>
      </div>
      {detail.isPending && <LoadingState label="Đang tải RSVP…" />}
      {detail.isError && <ErrorState error={detail.error} retry={() => void detail.refetch()} />}
      {detail.data && (
        <>
          <p className="text-sm">
            {detail.data.confirmedPartySize} người xác nhận · {detail.data.waitlistedPartySize}{" "}
            người chờ · {detail.data.places.length} chỗ mời{detail.data.locked ? " · Đã khóa" : ""}
          </p>
          <ul className="space-y-1 text-sm">
            {detail.data.participants.map((person) => (
              <li key={person.id}>
                {person.fullName} — {person.attendanceStatus}
              </li>
            ))}
          </ul>
          {detail.data.pendingRequest && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm">
              Khách đang có yêu cầu thay đổi chờ duyệt.
            </p>
          )}
          {editable && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void setLock(!detail.data.locked)}
                >
                  {detail.data.locked ? "Mở khóa thiệp" : "Khóa thiệp"}
                </Button>
                {guest.groupId && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void setLock(true, true)}
                    >
                      Khóa nhóm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void setLock(false, true)}
                    >
                      Mở khóa nhóm
                    </Button>
                  </>
                )}
              </div>
              <HostAnswerForm
                key={detail.data.version}
                weddingId={weddingId}
                guestId={guest.guestId}
                rsvp={detail.data}
                saved={() => {
                  setNotice("Đã lưu câu trả lời thay khách.");
                  void cache.invalidateQueries({ queryKey: hostRsvpKeys.all(weddingId) });
                }}
                failed={setError}
              />
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-green-800">
          {notice}
        </p>
      )}
    </section>
  );
}

function HostAnswerForm({
  weddingId,
  guestId,
  rsvp,
  saved,
  failed,
}: {
  weddingId: string;
  guestId: string;
  rsvp: Awaited<ReturnType<typeof getHostRsvp>>;
  saved: () => void;
  failed: (error: string) => void;
}) {
  const { api } = useRuntime();
  const [selected, setSelected] = useState(
    () =>
      new Set(
        rsvp.participants
          .filter(
            (person) =>
              person.attendanceStatus === "ATTENDING" || person.attendanceStatus === "WAITLISTED",
          )
          .map((person) => person.id),
      ),
  );
  const [newNames, setNewNames] = useState("");
  const [note, setNote] = useState(rsvp.note ?? "");
  const [source, setSource] = useState<"PHONE" | "CHAT" | "IN_PERSON" | "OTHER">("PHONE");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    failed("");
    setSaving(true);
    const plusOnes = newNames
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
    try {
      await saveHostRsvp(api, weddingId, guestId, {
        expectedVersion: rsvp.version,
        decision: selected.size + plusOnes.length ? "ATTENDING" : "DECLINED",
        participantIds: [...selected],
        plusOnes,
        note: note.trim(),
        source,
      });
      saved();
    } catch (error) {
      failed(message(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="space-y-3 border-t pt-4" onSubmit={(event) => void submit(event)}>
      <h3 className="font-medium">Nhập câu trả lời thay khách</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {rsvp.participants.map((person) => (
          <label key={person.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(person.id)}
              onChange={(event) =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(person.id);
                  else next.delete(person.id);
                  return next;
                })
              }
            />
            {person.fullName}
          </label>
        ))}
      </div>
      <label className="block text-sm">
        Tên người mới đi cùng (mỗi dòng một người)
        <textarea
          className="mt-1 w-full rounded-lg border bg-background p-3"
          value={newNames}
          onChange={(event) => setNewNames(event.target.value)}
          rows={2}
        />
      </label>
      <label className="block text-sm">
        Ghi chú
        <textarea
          className="mt-1 w-full rounded-lg border bg-background p-3"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={2}
        />
      </label>
      <label className="block text-sm">
        Nguồn trả lời
        <select
          className={`${fieldClass} mt-1 max-w-xs`}
          value={source}
          onChange={(event) => setSource(event.target.value as typeof source)}
        >
          <option value="PHONE">Điện thoại</option>
          <option value="CHAT">Tin nhắn</option>
          <option value="IN_PERSON">Trực tiếp</option>
          <option value="OTHER">Khác</option>
        </select>
      </label>
      <Button type="submit" disabled={saving}>
        {saving ? "Đang lưu…" : "Lưu thay khách"}
      </Button>
    </form>
  );
}
