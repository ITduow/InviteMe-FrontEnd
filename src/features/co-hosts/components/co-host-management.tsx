"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ScopeEditor } from "./scope-editor";
import { PERMISSION_LABELS } from "../utils/scopes";
import { useLocale } from "@/i18n/language-context";
import { formatDate } from "@/i18n/format";

type InviteInput = { email: string };

function friendlyError(
  error: unknown,
  action: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!(error instanceof ApiError)) return t("errors.actionFailed", { action });
  if (error.code === "network") return t("errors.network");
  if (error.status === 403) return t("errors.ownerOnly");
  if (error.status === 409) return t("errors.conflict");
  if (error.status === 422 || error.status === 400) return t("errors.invalidScopes");
  if (error.status === 404) return t("errors.notFound");
  return t("errors.actionFailedLater", { action });
}

function scopeDescription(
  grant: PermissionScope,
  names: Map<string, string>,
  t: (key: string) => string,
) {
  if (grant.permission === "CHECKIN_MANAGE" && !grant.weddingWide) {
    return t("legacyScope");
  }
  return grant.weddingWide
    ? t("wholeWedding")
    : grant.groupIds.map((id) => names.get(id) ?? t("deletedGroup")).join(", ");
}

export function CoHostManagement({ weddingId }: { weddingId: string }) {
  const { t } = useTranslation("cohost");
  const { language } = useLocale();
  const { api } = useRuntime();
  const { isOwner } = usePermission();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const inviteSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .pipe(z.email(t("validation.emailInvalid")).max(256, t("validation.emailMax"))),
      }),
    [t],
  );
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
          ? t("inviteSent", { email: result.email })
          : t("inviteQueuedButEmailFailed", { email: result.email }),
      );
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: coHostKeys.invitations(weddingId) });
    },
    onError: (error) => setActionError(friendlyError(error, t("actions.sendInvite"), t)),
  });
  const revokeInvitation = useMutation({
    mutationFn: (id: string) => revokeCoHostInvitation(api, weddingId, id),
    onSuccess: refresh,
    onError: (error) => setActionError(friendlyError(error, t("actions.revokeInvite"), t)),
  });
  const saveScopes = useMutation({
    mutationFn: ({ userId, grants }: { userId: string; grants: PermissionScope[] }) =>
      updateCoHostScopes(api, weddingId, userId, grants),
    onSuccess: async () => {
      setEditing(null);
      setNotice(t("scopesUpdated"));
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: coHostKeys.members(weddingId) });
    },
    onError: (error) => setActionError(friendlyError(error, t("actions.updatePermissions"), t)),
  });
  const revokeMember = useMutation({
    mutationFn: (userId: string) => revokeCoHost(api, weddingId, userId),
    onSuccess: async () => {
      setEditing(null);
      setNotice(t("accessRevoked"));
      setActionError("");
      await refresh();
    },
    onError: (error) => setActionError(friendlyError(error, t("actions.revokeCoHost"), t)),
  });

  if (!isOwner)
    return <EmptyState title={t("ownerOnlyTitle")} description={t("ownerOnlyDescription")} />;
  if (members.isPending || invitations.isPending || groups.isPending)
    return <LoadingState label={t("loadingMembers")} />;
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
      <PageHeader title={t("title")} description={t("description")} />
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
            <h2 className="text-xl font-semibold">{t("sendInvite")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("inviteDescription")}</p>
          </div>
        </div>
        <div className="space-y-4">
          <FormField control={form.control} name="email" label={t("coHostEmail")}>
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
            submitLabel={t("sendInvite")}
            busy={invite.isPending}
            onSubmit={(grants) =>
              void form.handleSubmit((values) => invite.mutate({ email: values.email, grants }))()
            }
          />
        </div>
        {invite.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("sendingInvite")}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <UsersRound className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">{t("activeMembers")}</h2>
          <Chip>{activeMembers.length}</Chip>
        </div>
        {activeMembers.length === 0 ? (
          <EmptyState title={t("noCoHosts")} description={t("noCoHostsDescription")} />
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
          <h2 className="text-xl font-semibold">{t("pendingInvites")}</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={invitations.isFetching}
            onClick={() => void invitations.refetch()}
          >
            <RefreshCw aria-hidden="true" /> {t("refresh")}
          </Button>
        </div>
        {!openInvitations.length ? (
          <EmptyState
            title={t("noPendingInvites")}
            description={t("noPendingInvitesDescription")}
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
                      {invitation.status === "SENT" ? t("emailSent") : t("emailPending")}
                    </Chip>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("expiresAt")}{" "}
                    {formatDate(invitation.expiresAt, language, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <GrantList grants={invitation.grants} groupNames={groupNames} />
                </div>
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="outline" className="shrink-0">
                      {t("revokeInvite")}
                    </Button>
                  }
                  title={t("revokeInviteConfirmTitle")}
                  description={t("revokeInviteConfirmDescription", { email: invitation.email })}
                  cancelLabel={t("keepInvite")}
                  confirmLabel={revokeInvitation.isPending ? t("revoking") : t("revoke")}
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
  const { t } = useTranslation("cohost");
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
            {editing ? t("closeEditor") : t("editScope")}
          </Button>
          <ConfirmDialog
            trigger={
              <Button type="button" variant="destructive">
                {t("revokeAccess")}
              </Button>
            }
            title={t("revokeAccessConfirmTitle")}
            description={t("revokeAccessConfirmDescription", { name: member.fullName })}
            cancelLabel={t("cancel")}
            confirmLabel={t("revokeAccess")}
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
          submitLabel={t("saveScope")}
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
  const { t } = useTranslation("cohost");
  if (!grants.length) return <p className="text-sm text-muted-foreground">{t("noPermissions")}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {grants.map((grant) => (
        <li key={grant.permission}>
          <Chip title={scopeDescription(grant, groupNames, t)}>
            {t(`permissions.${grant.permission}`)} · {scopeDescription(grant, groupNames, t)}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
