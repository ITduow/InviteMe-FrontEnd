"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { MailPlus, RefreshCw, UsersRound } from "lucide-react";
import { z } from "zod";
import { useRuntime } from "@/core/config/runtime";
import { ApiError } from "@/core/api/api-error";
import { usePermission } from "@/shared/components/permission-guard";
import { PageHeader } from "@/shared/components/page-header";
import { ConfirmDialog } from "@/shared/feedback/confirm-dialog";
import { EmptyState } from "@/shared/feedback/empty-state";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { Button } from "@/shared/ui/button";
import { Chip } from "@/shared/ui/chip";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/forms/form-field";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  coHostKeys,
  createCoHostInvitation,
  listCoHostInvitations,
  listCoHosts,
  listPlanningGroups,
  revokeCoHost,
  revokeCoHostInvitation,
  updateCoHostScopes,
  type CoHost,
  type PermissionScope,
} from "../api/co-host.api";
import { PERMISSION_LABELS } from "../utils/scopes";
import { ScopeEditor } from "./scope-editor";

const inviteSchema = z.object({
  email: z.string().trim().pipe(z.email("Email không hợp lệ.").max(256)),
});
type InviteInput = z.infer<typeof inviteSchema>;

function friendlyError(error: unknown, action: string) {
  if (!(error instanceof ApiError)) return `Chưa thể ${action}. Vui lòng thử lại.`;
  if (error.code === "network")
    return "Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và thử lại.";
  if (error.status === 403) return "Chỉ chủ tiệc mới có thể quản lý co-host.";
  if (error.status === 409) return "Thông tin đã thay đổi. Tải lại danh sách rồi thử lại.";
  if (error.status === 422 || error.status === 400)
    return "Một hoặc nhiều quyền/phạm vi chưa hợp lệ.";
  if (error.status === 404) return "Không tìm thấy co-host hoặc nhóm khách đã chọn.";
  return `Chưa thể ${action}. Vui lòng thử lại sau.`;
}

function scopeDescription(grant: PermissionScope, names: Map<string, string>) {
  if (grant.permission === "CHECKIN_MANAGE" && !grant.weddingWide) {
    return "Phạm vi nhóm cũ — BE không chấp nhận";
  }
  return grant.weddingWide
    ? "Toàn bộ đám cưới"
    : grant.groupIds.map((id) => names.get(id) ?? "Nhóm đã xóa").join(", ");
}

export function CoHostManagement({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const { isOwner } = usePermission();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });

  const members = useQuery({
    queryKey: coHostKeys.members(weddingId),
    queryFn: ({ signal }) => listCoHosts(api, weddingId, signal),
    enabled: isOwner,
  });
  const invitations = useQuery({
    queryKey: coHostKeys.invitations(weddingId),
    queryFn: ({ signal }) => listCoHostInvitations(api, weddingId, signal),
    enabled: isOwner,
  });
  const groups = useQuery({
    queryKey: coHostKeys.groups(weddingId),
    queryFn: ({ signal }) => listPlanningGroups(api, weddingId, signal),
    enabled: isOwner,
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: coHostKeys.members(weddingId) }),
      queryClient.invalidateQueries({ queryKey: coHostKeys.invitations(weddingId) }),
    ]);
  }

  const invite = useMutation({
    mutationFn: ({ email, grants }: { email: string; grants: PermissionScope[] }) =>
      createCoHostInvitation(api, weddingId, email, grants),
    onSuccess: async (result) => {
      form.reset();
      setNotice(
        result.status === "SENT"
          ? `Đã gửi lời mời đến ${result.email}. Link có hiệu lực 72 giờ.`
          : `Đã tạo lời mời cho ${result.email}, nhưng email chưa gửi được. Hãy kiểm tra dịch vụ email với BE.`,
      );
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: coHostKeys.invitations(weddingId) });
    },
    onError: (error) => setActionError(friendlyError(error, "gửi lời mời")),
  });
  const revokeInvitation = useMutation({
    mutationFn: (id: string) => revokeCoHostInvitation(api, weddingId, id),
    onSuccess: refresh,
    onError: (error) => setActionError(friendlyError(error, "thu hồi lời mời")),
  });
  const saveScopes = useMutation({
    mutationFn: ({ userId, grants }: { userId: string; grants: PermissionScope[] }) =>
      updateCoHostScopes(api, weddingId, userId, grants),
    onSuccess: async () => {
      setEditing(null);
      setNotice("Đã cập nhật quyền và phạm vi cho co-host.");
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: coHostKeys.members(weddingId) });
    },
    onError: (error) => setActionError(friendlyError(error, "cập nhật quyền")),
  });
  const revokeMember = useMutation({
    mutationFn: (userId: string) => revokeCoHost(api, weddingId, userId),
    onSuccess: async () => {
      setEditing(null);
      setNotice("Đã thu hồi quyền truy cập của co-host.");
      setActionError("");
      await refresh();
    },
    onError: (error) => setActionError(friendlyError(error, "thu hồi co-host")),
  });

  if (!isOwner)
    return (
      <EmptyState
        title="Chỉ chủ tiệc có thể quản lý co-host"
        description="Bạn không có quyền gửi lời mời hoặc thay đổi phạm vi truy cập của thành viên."
      />
    );
  if (members.isPending || invitations.isPending || groups.isPending)
    return <LoadingState label="Đang tải thành viên và quyền truy cập…" />;
  if (members.isError)
    return <ErrorState error={members.error} retry={() => void members.refetch()} />;
  if (invitations.isError)
    return <ErrorState error={invitations.error} retry={() => void invitations.refetch()} />;
  if (groups.isError)
    return <ErrorState error={groups.error} retry={() => void groups.refetch()} />;

  const groupNames = new Map(groups.data.map((group) => [group.id, group.name]));
  const activeMembers = members.data.filter((member) => member.status === "ACTIVE");
  const openInvitations = invitations.data.filter((invitation) =>
    ["PENDING", "SENT"].includes(invitation.status),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Co-host và quyền truy cập"
        description="Mời người đáng tin cậy và giới hạn quyền của họ theo toàn bộ đám cưới hoặc từng nhóm khách."
      />
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}

      <section className="space-y-5 rounded-2xl border bg-card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <MailPlus aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Gửi lời mời co-host</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lời mời được gửi qua email, có hiệu lực 72 giờ.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <FormField control={form.control} name="email" label="Email của co-host">
            {(field) => (
              <Input
                {...field}
                value={String(field.value ?? "")}
                type="email"
                autoComplete="email"
                placeholder="ten@example.com"
              />
            )}
          </FormField>
          <ScopeEditor
            groups={groups.data}
            submitLabel="Gửi lời mời"
            busy={invite.isPending}
            onSubmit={(grants) =>
              void form.handleSubmit((values) => invite.mutate({ email: values.email, grants }))()
            }
          />
        </div>
        {invite.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tạo và gửi lời mời…
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <UsersRound className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Thành viên đang hoạt động</h2>
          <Chip>{activeMembers.length}</Chip>
        </div>
        {activeMembers.length === 0 ? (
          <EmptyState title="Chưa có co-host" description="Gửi lời mời để cùng quản lý đám cưới." />
        ) : (
          <div className="space-y-4">
            {activeMembers.map((member) => (
              <CoHostCard
                key={member.userId}
                member={member}
                groups={groups.data}
                editing={editing === member.userId}
                busy={saveScopes.isPending || revokeMember.isPending}
                onEdit={() => setEditing(editing === member.userId ? null : member.userId)}
                onSave={(grants) => saveScopes.mutate({ userId: member.userId, grants })}
                onRevoke={() => revokeMember.mutate(member.userId)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Lời mời đang chờ</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={invitations.isFetching}
            onClick={() => void invitations.refetch()}
          >
            <RefreshCw aria-hidden="true" /> Làm mới
          </Button>
        </div>
        {!openInvitations.length ? (
          <EmptyState
            title="Không có lời mời đang chờ"
            description="Lời mời mới sẽ xuất hiện ở đây."
          />
        ) : (
          <div className="space-y-3">
            {openInvitations.map((invitation) => (
              <article
                key={invitation.id}
                className="space-y-3 rounded-xl border bg-card p-4 md:flex md:items-start md:justify-between md:gap-6"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{invitation.email}</h3>
                    <Chip tone={invitation.status === "SENT" ? "success" : "neutral"}>
                      {invitation.status === "SENT" ? "Đã gửi email" : "Chờ gửi email"}
                    </Chip>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Hết hạn{" "}
                    {format(new Date(invitation.expiresAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                  </p>
                  <GrantList grants={invitation.grants} groupNames={groupNames} />
                </div>
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="outline" className="shrink-0">
                      Thu hồi lời mời
                    </Button>
                  }
                  title="Thu hồi lời mời này?"
                  description={`Link gửi đến ${invitation.email} sẽ không còn dùng được.`}
                  cancelLabel="Giữ lời mời"
                  confirmLabel={revokeInvitation.isPending ? "Đang thu hồi…" : "Thu hồi"}
                  onConfirm={() => revokeInvitation.mutate(invitation.id)}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CoHostCard({
  member,
  groups,
  editing,
  busy,
  onEdit,
  onSave,
  onRevoke,
}: {
  member: CoHost;
  groups: { id: string; name: string }[];
  editing: boolean;
  busy: boolean;
  onEdit: () => void;
  onSave: (grants: PermissionScope[]) => void;
  onRevoke: () => void;
}) {
  const groupNames = new Map(groups.map((group) => [group.id, group.name]));
  return (
    <article className="space-y-4 rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{member.fullName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onEdit}>
            {editing ? "Đóng chỉnh sửa" : "Sửa phạm vi"}
          </Button>
          <ConfirmDialog
            trigger={
              <Button type="button" variant="destructive">
                Thu hồi quyền
              </Button>
            }
            title="Thu hồi quyền truy cập?"
            description={`${member.fullName} sẽ mất toàn bộ quyền tại đám cưới này.`}
            cancelLabel="Hủy"
            confirmLabel="Thu hồi quyền"
            onConfirm={onRevoke}
          />
        </div>
      </div>
      {editing ? (
        <ScopeEditor
          groups={groups}
          initialGrants={
            member.scopes ??
            member.permissions.flatMap((permission) => {
              if (!Object.hasOwn(PERMISSION_LABELS, permission)) return [];
              return [
                {
                  permission: permission as keyof typeof PERMISSION_LABELS,
                  weddingWide: true,
                  groupIds: [],
                },
              ];
            })
          }
          submitLabel="Lưu phạm vi mới"
          busy={busy}
          onSubmit={onSave}
        />
      ) : (
        <GrantList grants={member.scopes ?? []} groupNames={groupNames} />
      )}
    </article>
  );
}

function GrantList({
  grants,
  groupNames,
}: {
  grants: PermissionScope[];
  groupNames: Map<string, string>;
}) {
  if (!grants.length) return <p className="text-sm text-muted-foreground">Chưa cấp quyền.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {grants.map((grant) => (
        <li key={grant.permission}>
          <Chip title={scopeDescription(grant, groupNames)}>
            {PERMISSION_LABELS[grant.permission]} · {scopeDescription(grant, groupNames)}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
