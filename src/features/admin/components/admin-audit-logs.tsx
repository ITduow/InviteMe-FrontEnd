"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/feedback/empty-state";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { adminApi } from "../api/admin.api";

function bound(value: string, end: boolean) {
  return value
    ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`).toISOString()
    : undefined;
}
function label(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function AdminAuditLogs() {
  const { api } = useRuntime();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ action: "", entityType: "", from: "", to: "" });
  const [filters, setFilters] = useState<{
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }>({});
  const [error, setError] = useState("");
  const logs = useQuery({
    queryKey: ["admin-audit-logs", page, filters],
    queryFn: ({ signal }) => adminApi.auditLogs(api, { page, pageSize: 25, ...filters }, signal),
  });
  function apply(event: FormEvent) {
    event.preventDefault();
    if (draft.from && draft.to && draft.to < draft.from) {
      setError("End date must be on or after start date.");
      return;
    }
    setError("");
    setPage(1);
    setFilters({
      action: draft.action.trim() || undefined,
      entityType: draft.entityType.trim() || undefined,
      from: bound(draft.from, false),
      to: bound(draft.to, true),
    });
  }
  function reset() {
    setDraft({ action: "", entityType: "", from: "", to: "" });
    setFilters({});
    setError("");
    setPage(1);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform audit log"
        description="System-wide history of sensitive actions. Metadata is filtered to avoid exposing contact details, tokens or message content."
      />
      <form
        onSubmit={apply}
        className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <label className="grid gap-1 text-sm">
          Action
          <Input
            value={draft.action}
            maxLength={100}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
            placeholder="e.g. GUEST_IMPORTED"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Record type
          <Input
            value={draft.entityType}
            maxLength={100}
            onChange={(e) => setDraft({ ...draft, entityType: e.target.value })}
            placeholder="e.g. planning_guests"
          />
        </label>
        <label className="grid gap-1 text-sm">
          From
          <Input
            type="date"
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          To
          <Input
            type="date"
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Filter</Button>
          <Button type="button" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {logs.isPending && <LoadingState label="Loading platform activity…" />}
      {logs.isError && <ErrorState error={logs.error} retry={() => void logs.refetch()} />}
      {logs.data &&
        (logs.data.items.length === 0 ? (
          <EmptyState
            title="No matching activity"
            description="Try removing a filter or choosing a wider date range."
          />
        ) : (
          <>
            <div className="space-y-3">
              {logs.data.items.map((log) => (
                <article key={log.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{log.action.replaceAll("_", " ")}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {log.actorName || log.actorEmail || log.actorType} · {log.entityType}
                      </p>
                    </div>
                    <time className="text-sm text-muted-foreground" dateTime={log.createdAt}>
                      {label(log.createdAt)}
                    </time>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    {log.weddingTitle && <span>Wedding: {log.weddingTitle}</span>}
                    {log.weddingId && <span>Wedding ID: {log.weddingId}</span>}
                    {log.entityId && <span>Record ID: {log.entityId}</span>}
                  </div>
                </article>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {logs.data.totalCount} events · Page {logs.data.page}/
                {Math.max(logs.data.totalPages, 1)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1 || logs.isFetching}
                  onClick={() => setPage((x) => x - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= logs.data.totalPages || logs.isFetching}
                  onClick={() => setPage((x) => x + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ))}
    </div>
  );
}
