"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Upload,
  Users,
  UserRoundCheck,
  Clock3,
  Armchair,
  Search,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ErrorState } from "@/shared/feedback/error-state";
import { guestKeys, getGuests, getPeople, getReport, type GuestParams } from "../api/guest.api";
import { GuestImport } from "./guest-import";
import { GuestDetail } from "./guest-detail";

const sides: Record<string, string> = {
  BRIDE: "Nhà gái",
  GROOM: "Nhà trai",
  MUTUAL: "Cả hai",
  OTHER: "Khác",
};
const roles: Record<string, string> = {
  PRIMARY: "Người đại diện",
  SPOUSE: "Vợ/chồng",
  CHILD: "Con",
  OTHER: "Thành viên khác",
};
const attendance: Record<string, string> = {
  PENDING: "Chưa phản hồi",
  ATTENDING: "Tham dự",
  DECLINED: "Từ chối",
  WAITLISTED: "Danh sách chờ",
};
const invitations: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  REVOKED: "Đã thu hồi",
  ARCHIVED: "Đã lưu trữ",
};
function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs ${value === "ATTENDING" ? "bg-emerald-50 text-emerald-800" : value === "DECLINED" ? "bg-red-50 text-red-800" : value === "WAITLISTED" ? "bg-blue-50 text-blue-800" : value === "PENDING" ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground"}`}
    >
      {label}
    </span>
  );
}
export function GuestDashboard({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const { can } = usePermission();
  const [importing, setImporting] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [view, setView] = useState<"groups" | "people">("groups");
  const [peoplePage, setPeoplePage] = useState(1);
  const [search, setSearch] = useState("");
  const [params, setParams] = useState<GuestParams>({
    page: 1,
    search: "",
    recordStatus: "ACTIVE",
    sort: "fullName:asc",
    withoutInvitation: false,
  });
  const groups = useQuery({
    queryKey: guestKeys.list(weddingId, params),
    queryFn: ({ signal }) => getGuests(api, weddingId, params, signal),
    enabled: can("GUEST_VIEW") && view === "groups" && !importing,
  });
  const people = useQuery({
    queryKey: guestKeys.people(weddingId, peoplePage),
    queryFn: ({ signal }) => getPeople(api, weddingId, peoplePage, signal),
    enabled: can("GUEST_VIEW") && view === "people" && !importing,
  });
  const report = useQuery({
    queryKey: guestKeys.report(weddingId),
    queryFn: ({ signal }) => getReport(api, weddingId, signal),
    enabled: can("ANALYTICS_VIEW") && !importing,
  });
  if (importing && can("GUEST_EDIT"))
    return (
      <GuestImport key={weddingId} weddingId={weddingId} onClose={() => setImporting(false)} />
    );
  const current = view === "groups" ? groups : people;
  const page = view === "groups" ? params.page : peoplePage;
  const setPage = (value: number) =>
    view === "groups" ? setParams({ ...params, page: value }) : setPeoplePage(value);
  const metrics = report.data
    ? [
        {
          title: "Dự kiến tham dự",
          value: report.data.estimatedHeadcount,
          note: "Ước tính từ danh sách khách",
          icon: Users,
        },
        {
          title: "Đã xác nhận",
          value: report.data.confirmedHeadcount,
          note: `${report.data.declinedHeadcount} từ chối`,
          icon: UserRoundCheck,
        },
        {
          title: "Chưa phản hồi",
          value: report.data.pendingHeadcount,
          note: `${report.data.waitlistedHeadcount} trong danh sách chờ`,
          icon: Clock3,
        },
        {
          title: "Đã xếp chỗ",
          value: report.data.seatedHeadcount,
          note: "Số người đã có vị trí bàn",
          icon: Armchair,
        },
      ]
    : [];
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Những người cùng chung vui
          </p>
          <h1 className="font-serif text-3xl">Quản lý khách mời</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Quản lý đầu mối nhận thiệp và từng người tham dự. Mỗi thành viên có trạng thái RSVP
            riêng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("GUEST_EDIT") && (
            <>
              <Button asChild variant="outline">
                <a href="/templates/khach-moi.csv" download>
                  <Download /> Tải file mẫu
                </a>
              </Button>
              <Button onClick={() => setImporting(true)}>
                <Upload /> Nhập CSV / Excel
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Tải lại danh sách và thống kê"
            onClick={() => {
              void current.refetch();
              if (can("ANALYTICS_VIEW")) void report.refetch();
            }}
            disabled={current.isFetching}
          >
            <RefreshCw className={current.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>
      {can("ANALYTICS_VIEW") && (
        <>
          {report.isPending && (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Đang tải thống kê">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-32 animate-pulse rounded-xl border bg-card" />
              ))}
            </div>
          )}
          {report.isError && (
            <ErrorState error={report.error} retry={() => void report.refetch()} />
          )}
          {report.data && (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {metrics.map(({ title, value, note, icon: Icon }) => (
                <div key={title} className="rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{title}</p>
                    <Icon className="size-5 text-sage" />
                  </div>
                  <p className="my-3 text-3xl font-semibold tabular-nums">
                    {value.toLocaleString("vi-VN")}
                  </p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
          <div className="flex rounded-lg bg-muted p-1" aria-label="Kiểu danh sách">
            <Button
              variant={view === "groups" ? "default" : "ghost"}
              onClick={() => setView("groups")}
            >
              Theo nhóm mời
            </Button>
            <Button
              variant={view === "people" ? "default" : "ghost"}
              onClick={() => setView("people")}
            >
              Theo từng người
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {current.data
              ? `${current.data.totalCount.toLocaleString("vi-VN")} ${view === "groups" ? "nhóm trong kết quả" : "người"}`
              : "Đang tải danh sách…"}
          </span>
        </div>
        {view === "groups" && (
          <form
            className="flex flex-wrap items-end gap-3 border-b p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setParams({ ...params, page: 1, search: search.trim() });
            }}
          >
            <label className="min-w-48 flex-1 text-xs text-muted-foreground">
              Tên đại diện hoặc mã nhóm
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 size-4" />
                <Input
                  className="pl-9"
                  placeholder="Tìm khách mời…"
                  maxLength={200}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </label>
            <Button variant="outline" type="submit">
              Tìm kiếm
            </Button>
            <label className="text-xs text-muted-foreground">
              Hồ sơ
              <select
                className="mt-2 block h-10 rounded-lg border bg-background px-3 text-sm"
                value={params.recordStatus}
                onChange={(event) =>
                  setParams({ ...params, page: 1, recordStatus: event.target.value })
                }
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
                <option value="ALL">Tất cả</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Sắp xếp
              <select
                className="mt-2 block h-10 rounded-lg border bg-background px-3 text-sm"
                value={params.sort}
                onChange={(event) => setParams({ ...params, page: 1, sort: event.target.value })}
              >
                <option value="fullName:asc">Tên A → Z</option>
                <option value="guestCode:asc">Mã nhóm A → Z</option>
                <option value="createdAt:desc">Mới thêm gần đây</option>
              </select>
            </label>
            <label className="flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={params.withoutInvitation}
                onChange={(event) =>
                  setParams({ ...params, page: 1, withoutInvitation: event.target.checked })
                }
              />{" "}
              Chưa tạo thiệp
            </label>
          </form>
        )}
        {current.isPending ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Đang tải khách mời…</div>
        ) : current.isError ? (
          <div className="p-5">
            <ErrorState error={current.error} retry={() => void current.refetch()} />
          </div>
        ) : current.data?.items.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center">
            <Users className="mb-4 size-10 text-sage" />
            <h2 className="font-serif text-xl">
              {view === "groups" &&
              (params.search || params.withoutInvitation || params.recordStatus !== "ACTIVE")
                ? "Không có nhóm phù hợp"
                : "Chưa có khách trong danh sách này"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {view === "groups" &&
              (params.search || params.withoutInvitation || params.recordStatus !== "ACTIVE")
                ? "Thử thay đổi tìm kiếm hoặc bộ lọc."
                : "Nhập file để thêm người đại diện và các thành viên."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="divide-y md:hidden">
              {view === "groups"
                ? groups.data?.items.map((guest) => (
                    <article key={guest.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="text-left font-medium underline-offset-4 hover:underline"
                          onClick={() => setSelectedGuest(guest.id)}
                          aria-label={`Chi tiết nhóm của ${guest.fullName}`}
                        >
                          {guest.fullName}
                        </button>
                        <Badge
                          value={guest.invitationStatus ?? "NONE"}
                          label={
                            guest.invitationStatus
                              ? (invitations[guest.invitationStatus] ?? guest.invitationStatus)
                              : "Chưa tạo thiệp"
                          }
                        />
                      </div>
                      <p className="break-all text-xs text-muted-foreground">
                        {guest.guestCode} ·{" "}
                        {guest.side ? (sides[guest.side] ?? guest.side) : "Chưa phân loại"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {guest.hasPhone ? "Có số điện thoại" : "Chưa có số điện thoại"} ·{" "}
                        {guest.hasEmail ? "Có email" : "Chưa có email"}
                      </p>
                    </article>
                  ))
                : people.data?.items.map((person) => (
                    <article
                      key={person.id}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{person.fullName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {roles[person.type] ?? person.type}
                        </p>
                      </div>
                      <Badge
                        value={person.attendanceStatus}
                        label={attendance[person.attendanceStatus] ?? person.attendanceStatus}
                      />
                    </article>
                  ))}
            </div>
            <table className="hidden w-full min-w-[640px] text-left text-sm md:table">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  {(view === "groups"
                    ? [
                        "Đại diện nhận thiệp",
                        "Mã nhóm mời",
                        "Phía khách",
                        "Liên hệ",
                        "Thiệp mời",
                        "Hồ sơ",
                      ]
                    : ["Họ và tên", "Vai trò", "Trạng thái RSVP"]
                  ).map((label) => (
                    <th key={label} className="px-5 py-4 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view === "groups"
                  ? groups.data?.items.map((guest) => (
                      <tr key={guest.id} className="border-t hover:bg-muted/30">
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-serif">
                              {guest.fullName.slice(0, 1)}
                            </span>
                            <button
                              className="text-left font-medium underline-offset-4 hover:underline focus-visible:underline"
                              onClick={() => setSelectedGuest(guest.id)}
                              aria-label={`Chi tiết nhóm của ${guest.fullName}`}
                            >
                              {guest.fullName}
                            </button>
                          </div>
                        </td>
                        <td className="max-w-44 break-all px-5 py-5 text-xs">{guest.guestCode}</td>
                        <td className="px-5 py-5">
                          {guest.side ? (
                            (sides[guest.side] ?? guest.side)
                          ) : (
                            <span className="text-muted-foreground">Chưa phân loại</span>
                          )}
                        </td>
                        <td className="px-5 py-5">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {guest.hasPhone && (
                              <p className="flex items-center gap-1">
                                <Phone className="size-3" /> Có số điện thoại
                              </p>
                            )}
                            {guest.hasEmail && (
                              <p className="flex items-center gap-1">
                                <Mail className="size-3" /> Có email
                              </p>
                            )}
                            {!guest.hasPhone && !guest.hasEmail && <span>Chưa có liên hệ</span>}
                          </div>
                        </td>
                        <td className="px-5 py-5">
                          <Badge
                            value={guest.invitationStatus ?? "NONE"}
                            label={
                              guest.invitationStatus
                                ? (invitations[guest.invitationStatus] ?? guest.invitationStatus)
                                : "Chưa tạo thiệp"
                            }
                          />
                        </td>
                        <td className="px-5 py-5 text-xs text-muted-foreground">
                          {guest.recordStatus === "ACTIVE" ? "Hoạt động" : "Đã lưu trữ"}
                        </td>
                      </tr>
                    ))
                  : people.data?.items.map((person) => (
                      <tr key={person.id} className="border-t hover:bg-muted/30">
                        <td className="px-5 py-5 font-medium">{person.fullName}</td>
                        <td className="px-5 py-5 text-muted-foreground">
                          {roles[person.type] ?? person.type}
                        </td>
                        <td className="px-5 py-5">
                          <Badge
                            value={person.attendanceStatus}
                            label={attendance[person.attendanceStatus] ?? person.attendanceStatus}
                          />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
        {current.data && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/30 p-4 text-sm">
            <p className="text-muted-foreground">
              Trang {page} / {Math.max(1, Math.ceil(current.data.totalCount / 20))} · 20{" "}
              {view === "groups" ? "nhóm" : "người"} / trang
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || current.isFetching}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                disabled={page * 20 >= current.data.totalCount || current.isFetching}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Một nhóm, một đầu mối",
            text: "Người đại diện nhận thiệp chung. Nhóm khách là nhãn phân loại, khác với nhóm mời gia đình.",
          },
          {
            title: "Mỗi người một phản hồi",
            text: "Người đại diện, vợ/chồng và con đều có hồ sơ riêng để theo dõi tham dự.",
          },
          {
            title: "Import trước, gửi thiệp sau",
            text: "Khách mới chưa được gửi thiệp, chưa xác nhận tham dự và chưa được xếp bàn.",
          },
        ].map((item) => (
          <div className="rounded-xl border bg-card p-5" key={item.title}>
            <h2 className="font-medium">{item.title}</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
      {selectedGuest && (
        <GuestDetail
          key={selectedGuest}
          weddingId={weddingId}
          guestId={selectedGuest}
          onClose={() => setSelectedGuest(null)}
        />
      )}
    </section>
  );
}
