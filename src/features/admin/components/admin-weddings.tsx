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

export function AdminWeddings() {
  const { api } = useRuntime();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const weddings = useQuery({
    queryKey: ["admin-weddings", page, search, status],
    queryFn: ({ signal }) => adminApi.weddings(api, { page, pageSize: 20, search, status }, signal),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(draft.trim());
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Weddings"
        description="Review weddings across InviteMe and filter by owner, title, slug or status."
      />
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_200px_auto_auto] sm:items-end"
      >
        <label className="grid gap-1 text-sm">
          Search title, slug or owner email
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={100}
            placeholder="Search weddings"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="h-10 rounded-lg border bg-background px-3"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDraft("");
            setSearch("");
            setStatus("");
            setPage(1);
          }}
        >
          Reset
        </Button>
      </form>
      {weddings.isPending && <LoadingState label="Loading weddings…" />}
      {weddings.isError && (
        <ErrorState error={weddings.error} retry={() => void weddings.refetch()} />
      )}
      {weddings.data &&
        (weddings.data.items.length === 0 ? (
          <EmptyState
            title="No weddings found"
            description="Try a different search or status filter."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    {["Wedding", "Owner", "Status", "Capacity", "Created"].map((x) => (
                      <th key={x} className="px-4 py-3 font-medium">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {weddings.data.items.map((w) => (
                    <tr key={w.id}>
                      <td className="px-4 py-4">
                        <p className="font-medium">{w.title}</p>
                        <p className="text-xs text-muted-foreground">/{w.slug}</p>
                      </td>
                      <td className="px-4 py-4">{w.ownerEmail}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">{w.capacity ?? "Not set"}</td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                          new Date(w.createdAt),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {weddings.data.totalCount} weddings · Page {weddings.data.page}/
                {Math.max(weddings.data.totalPages, 1)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1 || weddings.isFetching}
                  onClick={() => setPage((x) => x - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= weddings.data.totalPages || weddings.isFetching}
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
