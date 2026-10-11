"use client";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Users, Mail, Phone } from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import { getGuestDetail, guestKeys } from "../api/guest.api";
const roles: Record<string, string> = {
  PRIMARY: "Người đại diện",
  SPOUSE: "Vợ/chồng",
  CHILD: "Con",
  OTHER: "Thành viên khác",
};
const statuses: Record<string, string> = {
  PENDING: "Chưa phản hồi",
  ATTENDING: "Tham dự",
  DECLINED: "Từ chối",
  WAITLISTED: "Danh sách chờ",
};
const sides: Record<string, string> = {
  BRIDE: "Nhà gái",
  GROOM: "Nhà trai",
  MUTUAL: "Cả hai",
  OTHER: "Khác",
};
const relationships: Record<string, string> = {
  FAMILY: "Họ hàng",
  FRIEND: "Bạn bè",
  COLLEAGUE: "Đồng nghiệp",
  NEIGHBOR: "Hàng xóm",
  PARTNER: "Đối tác",
  OTHER: "Khác",
};
export function GuestDetail({
  weddingId,
  guestId,
  onClose,
}: {
  weddingId: string;
  guestId: string;
  onClose: () => void;
}) {
  const { api } = useRuntime();
  const dialog = useRef<HTMLDialogElement>(null);
  const query = useQuery({
    queryKey: guestKeys.detail(weddingId, guestId),
    queryFn: ({ signal }) => getGuestDetail(api, weddingId, guestId, signal),
  });
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const data = query.data;
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="guest-detail-title"
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-lg overflow-y-auto border-l bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/25"
    >
      <header className="flex items-center justify-between border-b p-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Chi tiết nhóm mời
          </p>
          <h2 id="guest-detail-title" className="mt-2 font-serif text-2xl">
            {data?.fullName ?? "Đang tải…"}
          </h2>
        </div>
        <Button variant="ghost" size="icon" aria-label="Đóng chi tiết nhóm" onClick={onClose}>
          <X />
        </Button>
      </header>
      <div className="space-y-6 p-6">
        {query.isPending && <p>Đang tải thông tin…</p>}
        {query.isError && <ErrorState error={query.error} retry={() => void query.refetch()} />}
        {data && (
          <>
            <div className="rounded-xl border bg-background p-4">
              <p className="break-all text-xs text-muted-foreground">Mã nhóm · {data.guestCode}</p>
              <p className="mt-3 flex items-center gap-2 font-medium">
                <Users className="size-4" />
                {data.participants.length} người đã có tên
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Được thêm tối đa {data.additionalAllowance} người khi RSVP. Quyền thêm chưa tạo
                người hoặc giữ chỗ.
              </p>
            </div>
            <section>
              <h3 className="mb-3 font-medium">Đầu mối liên hệ</h3>
              <div className="space-y-2 text-sm">
                {data.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="size-4" />
                    {data.phone}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Chưa có số điện thoại</p>
                )}
                {data.email ? (
                  <p className="flex items-center gap-2 break-all">
                    <Mail className="size-4 shrink-0" />
                    {data.email}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Chưa có email</p>
                )}
              </div>
            </section>
            <dl className="grid grid-cols-2 gap-4 rounded-xl border p-4 text-sm">
              {[
                ["Phía khách", data.side ? (sides[data.side] ?? data.side) : "Chưa phân loại"],
                [
                  "Mối quan hệ",
                  data.relationship
                    ? (relationships[data.relationship] ?? data.relationship)
                    : "Chưa phân loại",
                ],
                ["Nhóm khách", data.groupName ?? "Chưa phân loại"],
                ["Hồ sơ", data.recordStatus === "ACTIVE" ? "Hoạt động" : "Đã lưu trữ"],
              ].map(([title, value]) => (
                <div key={title}>
                  <dt className="text-xs text-muted-foreground">{title}</dt>
                  <dd className="mt-1">{value}</dd>
                </div>
              ))}
            </dl>
            <section>
              <h3 className="mb-3 font-medium">Thành viên · {data.participants.length}</h3>
              <div className="divide-y rounded-xl border">
                {data.participants.map((person) => (
                  <div className="flex items-center justify-between gap-4 p-4" key={person.id}>
                    <div>
                      <p className="text-sm font-medium">{person.fullName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {roles[person.type] ?? person.type}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${person.attendanceStatus === "ATTENDING" ? "bg-emerald-50 text-emerald-800" : person.attendanceStatus === "DECLINED" ? "bg-red-50 text-red-800" : "bg-muted text-muted-foreground"}`}
                    >
                      {statuses[person.attendanceStatus] ?? person.attendanceStatus}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            {data.notes && (
              <section>
                <h3 className="mb-2 font-medium">Ghi chú</h3>
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {data.notes}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
