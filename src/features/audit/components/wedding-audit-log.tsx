"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/feedback/empty-state";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { listWeddingAuditLogs, type AuditLogFilters } from "../api/audit.api";

function localDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dateBound(value: string, endOfDay: boolean) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return date.toISOString();
}

export function WeddingAuditLog({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const { isOwner } = usePermission();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ action: "", entityType: "", from: "", to: "" });
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [filterError, setFilterError] = useState("");
  const query = useQuery({
    queryKey: ["wedding-audit-logs", weddingId, page, filters],
    queryFn: ({ signal }) => listWeddingAuditLogs(api, weddingId, page, filters, signal),
    enabled: isOwner,
  });

  if (!isOwner)
    return (
      <EmptyState
        title="Chỉ chủ tiệc có thể xem lịch sử hoạt động"
        description="Nhật ký chỉ hiển thị các thay đổi thuộc đám cưới này."
      />
    );

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.from && draft.to && draft.to < draft.from) {
      setFilterError("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
      return;
    }
    setFilterError("");
    setPage(1);
    setFilters({
      action: draft.action.trim() || undefined,
      entityType: draft.entityType.trim() || undefined,
      from: dateBound(draft.from, false),
      to: dateBound(draft.to, true),
    });
  }

  function reset() {
    setDraft({ action: "", entityType: "", from: "", to: "" });
    setFilters({});
    setFilterError("");
    setPage(1);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Lịch sử hoạt động"
        description="Theo dõi ai đã thực hiện hành động nào trong đám cưới này."
      />
      <form
        onSubmit={apply}
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <label className="grid gap-1 text-sm">
          Hành động
          <Input
            value={draft.action}
            maxLength={100}
            onChange={(event) => setDraft({ ...draft, action: event.target.value })}
            placeholder="Ví dụ: GUEST_UPDATED"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Loại dữ liệu
          <Input
            value={draft.entityType}
            maxLength={100}
            onChange={(event) => setDraft({ ...draft, entityType: event.target.value })}
            placeholder="Ví dụ: Guest"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Từ ngày
          <Input
            type="date"
            value={draft.from}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Đến ngày
          <Input
            type="date"
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={query.isFetching}>
            Lọc
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            Xóa lọc
          </Button>
        </div>
      </form>
      {filterError && (
        <p role="alert" className="text-sm text-destructive">
          {filterError}
        </p>
      )}
      {query.isPending && <LoadingState label="Đang tải lịch sử hoạt động…" />}
      {query.isError && <ErrorState error={query.error} retry={() => void query.refetch()} />}
      {query.data && (
        <>
          {!query.data.items.length ? (
            <EmptyState
              title="Chưa có hoạt động phù hợp"
              description="Thử bỏ bớt điều kiện lọc hoặc chọn khoảng ngày khác."
            />
          ) : (
            <div className="space-y-3">
              {query.data.items.map((entry) => (
                <article key={entry.id} className="space-y-2 rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{entry.action.replaceAll("_", " ")}</h2>
                      <p className="text-sm text-muted-foreground">
                        {entry.actorName || entry.actorEmail || entry.actorType} ·{" "}
                        {entry.entityType}
                      </p>
                    </div>
                    <time className="text-sm text-muted-foreground" dateTime={entry.createdAt}>
                      {localDateTime(entry.createdAt)}
                    </time>
                  </div>
                  {entry.entityId && (
                    <p className="break-all text-xs text-muted-foreground">
                      Mã đối tượng: {entry.entityId}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {query.data.totalCount} hoạt động · Trang {query.data.page}/
              {Math.max(query.data.totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                Trước
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= query.data.totalPages || query.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
