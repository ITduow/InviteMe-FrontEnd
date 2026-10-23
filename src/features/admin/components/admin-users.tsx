"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "@/shared/feedback/empty-state";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { adminApi } from "../api/admin.api";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function AdminUsers() {
  const { api } = useRuntime();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const users = useQuery({
    queryKey: ["admin-users", page, search, status, role],
    queryFn: ({ signal }) =>
      adminApi.users(api, { page, pageSize: 20, search, status, role }, signal),
  });
  const changed = async () => {
    setError("");
    await client.invalidateQueries({ queryKey: ["admin-users"] });
    await client.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
  const statusMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: "ACTIVE" | "SUSPENDED" }) =>
      adminApi.setUserStatus(api, id, value),
    onSuccess: changed,
    onError: (e) => setError(e instanceof Error ? e.message : "Could not update account status."),
  });
  const roleMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: "ADMIN" | "USER" }) =>
      adminApi.setUserRole(api, id, value),
    onSuccess: changed,
    onError: (e) => setError(e instanceof Error ? e.message : "Could not update account role."),
  });
  function apply(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Search accounts, manage user access, and assign the platform Admin role. Admin accounts are protected."
      />
      <form
        onSubmit={apply}
        className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_180px_180px_auto_auto] sm:items-end"
      >
        <label className="grid gap-1 text-sm">
          Search name or email
          <Input
            value={searchDraft}
            maxLength={100}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Email or full name"
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
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DISABLED">Deleted</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Platform role
          <select
            className="h-10 rounded-lg border bg-background px-3"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSearchDraft("");
            setSearch("");
            setStatus("");
            setRole("");
            setPage(1);
          }}
        >
          Reset
        </Button>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-card p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {users.isPending && <LoadingState label="Loading accounts…" />}
      {users.isError && <ErrorState error={users.error} retry={() => void users.refetch()} />}
      {users.data &&
        (users.data.items.length === 0 ? (
          <EmptyState
            title="No accounts found"
            description="Change the search or filters and try again."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    {["Account", "Role", "Status", "Created", "Actions"].map((x) => (
                      <th key={x} className="px-4 py-3 font-medium">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.data.items.map((user) => {
                    const protectedAdmin = user.role === "ADMIN";
                    return (
                      <tr key={user.id}>
                        <td className="px-4 py-4">
                          <p className="font-medium">{user.fullName || "Unnamed account"}</p>
                          <p className="text-muted-foreground">{user.email}</p>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            aria-label={`Platform role for ${user.email}${protectedAdmin ? " (protected)" : ""}`}
                            title={
                              protectedAdmin
                                ? "Admin accounts are protected from role and status changes."
                                : undefined
                            }
                            className="h-9 rounded-lg border bg-background px-2"
                            value={user.role}
                            disabled={
                              protectedAdmin || roleMutation.isPending || user.status !== "ACTIVE"
                            }
                            onChange={(e) =>
                              roleMutation.mutate({
                                id: user.id,
                                value: e.target.value as "ADMIN" | "USER",
                              })
                            }
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {dateLabel(user.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              protectedAdmin ||
                              statusMutation.isPending ||
                              user.status === "DISABLED"
                            }
                            title={
                              protectedAdmin
                                ? "Admin accounts are protected from role and status changes."
                                : undefined
                            }
                            onClick={() =>
                              statusMutation.mutate({
                                id: user.id,
                                value: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                              })
                            }
                          >
                            {protectedAdmin
                              ? "Protected"
                              : user.status === "ACTIVE"
                                ? "Suspend"
                                : user.status === "SUSPENDED"
                                  ? "Reactivate"
                                  : "Unavailable"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {users.data.totalCount} accounts · Page {users.data.page}/
                {Math.max(users.data.totalPages, 1)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1 || users.isFetching}
                  onClick={() => setPage((x) => x - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= users.data.totalPages || users.isFetching}
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
