"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import {
  getHostRsvp,
  hostRsvpKeys,
  listRsvpRequests,
  listRsvpWaitlist,
  resolveRsvpRequest,
  resolveRsvpWaitlist,
} from "../api/host-rsvp.api";

const reasonLabel = { LOCKED: "Thiệp đã khóa", DEADLINE_PASSED: "Đã quá hạn" };
const date = (value: string) => new Date(value).toLocaleString("vi-VN");

export function HostRsvpQueues({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const cache = useQueryClient();
  const { can } = usePermission();
  const editable = can("GUEST_EDIT");
  const [requestPage, setRequestPage] = useState(1);
  const [waitPage, setWaitPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requests = useQuery({
    queryKey: hostRsvpKeys.requests(weddingId, "PENDING", requestPage),
    queryFn: ({ signal }) => listRsvpRequests(api, weddingId, "PENDING", requestPage, signal),
  });
  const waitlist = useQuery({
    queryKey: hostRsvpKeys.waitlist(weddingId, waitPage),
    queryFn: ({ signal }) => listRsvpWaitlist(api, weddingId, waitPage, signal),
  });

  async function decide(
    kind: "request" | "waitlist",
    id: string,
    decision: "approve" | "reject" | "promote" | "decline",
  ) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      if (kind === "request" && (decision === "approve" || decision === "reject"))
        await resolveRsvpRequest(api, weddingId, id, decision);
      if (kind === "waitlist" && (decision === "promote" || decision === "decline"))
        await resolveRsvpWaitlist(api, weddingId, id, decision);
      await cache.invalidateQueries({ queryKey: hostRsvpKeys.all(weddingId) });
      setNotice("Đã cập nhật hàng chờ.");
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Không xử lý được. Hãy tải lại và thử lại.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hàng chờ RSVP"
        description="Duyệt yêu cầu đổi câu trả lời và người đi thêm."
      />
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
          {notice}
        </p>
      )}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Yêu cầu thay đổi</h2>
        {requests.isPending && <LoadingState label="Đang tải yêu cầu…" />}
        {requests.isError && (
          <ErrorState error={requests.error} retry={() => void requests.refetch()} />
        )}
        {requests.data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Không có yêu cầu chờ duyệt.</p>
        )}
        {requests.data?.items.map((item) => (
          <article key={item.id} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{item.recipientName}</h3>
                <p className="text-sm text-muted-foreground">
                  {reasonLabel[item.reason]} · {date(item.requestedAt)}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">
                Chờ duyệt
              </span>
            </div>
            <p className="text-sm">
              Muốn {item.change.decision === "ATTENDING" ? "tham dự" : "không tham dự"} ·{" "}
              {item.change.participantIds.length} người có sẵn
              {item.change.plusOnes?.length ? ` · thêm ${item.change.plusOnes.join(", ")}` : ""}
            </p>
            <QueueGuestInfo
              weddingId={weddingId}
              guestId={item.guestId}
              participantIds={item.change.participantIds}
            />
            {item.change.note && <p className="text-sm">Ghi chú: {item.change.note}</p>}
            {editable && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!!busyId}
                  onClick={() => void decide("request", item.id, "approve")}
                >
                  {busyId === item.id ? "Đang xử lý…" : "Duyệt"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busyId}
                  onClick={() => void decide("request", item.id, "reject")}
                >
                  Từ chối
                </Button>
              </div>
            )}
          </article>
        ))}
        {requests.data && (
          <Pager
            page={requestPage}
            total={requests.data.totalItems}
            pageSize={requests.data.pageSize}
            onChange={setRequestPage}
          />
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Người chờ chỗ</h2>
        {waitlist.isPending && <LoadingState label="Đang tải danh sách chờ…" />}
        {waitlist.isError && (
          <ErrorState error={waitlist.error} retry={() => void waitlist.refetch()} />
        )}
        {waitlist.data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Không có người chờ chỗ.</p>
        )}
        {waitlist.data?.items.map((item) => (
          <article
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
          >
            <div>
              <QueueGuestInfo weddingId={weddingId} guestId={item.guestId} waitlisted />
              <p className="text-sm text-muted-foreground">
                {item.kind === "FULL_PARTY" ? "Cả nhóm" : "Người đi thêm"} · {item.requestedSlots}{" "}
                chỗ · {date(item.requestedAt)}
              </p>
            </div>
            {editable && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!!busyId}
                  onClick={() => void decide("waitlist", item.id, "promote")}
                >
                  {busyId === item.id ? "Đang xử lý…" : "Nhận khách"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busyId}
                  onClick={() => void decide("waitlist", item.id, "decline")}
                >
                  Từ chối
                </Button>
              </div>
            )}
          </article>
        ))}
        {waitlist.data && (
          <Pager
            page={waitPage}
            total={waitlist.data.totalItems}
            pageSize={waitlist.data.pageSize}
            onChange={setWaitPage}
          />
        )}
      </section>
    </div>
  );
}

function QueueGuestInfo({
  weddingId,
  guestId,
  participantIds,
  waitlisted = false,
}: {
  weddingId: string;
  guestId: string;
  participantIds?: string[];
  waitlisted?: boolean;
}) {
  const { api } = useRuntime();
  const detail = useQuery({
    queryKey: hostRsvpKeys.detail(weddingId, guestId),
    queryFn: ({ signal }) => getHostRsvp(api, weddingId, guestId, signal),
  });
  if (detail.isError)
    return <p className="text-sm text-muted-foreground">Không tải được tên khách ({guestId}).</p>;
  if (!detail.data)
    return <p className="text-sm text-muted-foreground">Đang tải thông tin khách…</p>;
  const people = participantIds
    ? detail.data.participants.filter((person) => participantIds.includes(person.id))
    : waitlisted
      ? detail.data.participants.filter((person) => person.attendanceStatus === "WAITLISTED")
      : [];
  return (
    <div className="text-sm">
      {waitlisted && <h3 className="font-semibold">{detail.data.recipientName}</h3>}
      {people.length > 0 && (
        <p>Người liên quan: {people.map((person) => person.fullName).join(", ")}</p>
      )}
    </div>
  );
}

function Pager({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (last <= 1) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Trước
      </Button>
      <span>
        Trang {page}/{last}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= last}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </Button>
    </div>
  );
}
