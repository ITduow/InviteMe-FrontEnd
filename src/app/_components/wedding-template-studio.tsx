"use client";
import { AuthGuard } from "@/features/auth";
import { WeddingAccessProvider } from "@/features/weddings";
import { InvitationWording } from "@/features/guests";
import {
  TemplateStudio,
  getInvitationDesign,
  saveInvitationDesign,
} from "@/features/template-studio";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { SessionLoading } from "@/shared/feedback/session-loading";
import { ErrorState } from "@/shared/feedback/error-state";
import { usePermission } from "@/shared/components/permission-guard";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";

// Compose the guest management panel and design editor here to preserve feature boundaries.
export function WeddingTemplateStudio({
  weddingId,
  template,
  preview = false,
  wording = false,
}: {
  weddingId: string;
  template?: string;
  preview?: boolean;
  wording?: boolean;
}) {
  return (
    <AuthGuard>
      <WeddingAccessProvider weddingId={weddingId}>
        <PermissionGuard
          permission="WEDDING_EDIT"
          fallback={
            <EmptyState
              title="Không có quyền chỉnh sửa thiệp"
              description="Cần quyền chỉnh sửa wedding để mở Studio."
            />
          }
        >
          <ConnectedStudio
            weddingId={weddingId}
            initialTemplate={template ?? false}
            initialPreview={preview}
            initialWording={wording}
            backHref={`/weddings/${encodeURIComponent(weddingId)}/invitations`}
            wordingPanel={({ onPreview }) => (
              <PermissionGuard
                permission="INVITATION_SEND"
                fallback={<p>Cần quyền quản lý lời mời để xem preset của wedding.</p>}
              >
                <InvitationWording weddingId={weddingId} compact onPreview={onPreview} />
              </PermissionGuard>
            )}
          />
        </PermissionGuard>
      </WeddingAccessProvider>
    </AuthGuard>
  );
}

function ConnectedStudio({
  weddingId,
  ...props
}: { weddingId: string } & React.ComponentProps<typeof TemplateStudio>) {
  const { api } = useRuntime();
  const { can } = usePermission();
  const cache = useQueryClient();
  const key = ["invitation-design", weddingId];
  const design = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getInvitationDesign(api, weddingId, signal),
  });
  if (design.isPending) return <SessionLoading />;
  if (design.isError)
    return <ErrorState error={design.error} retry={() => void design.refetch()} />;
  return (
    <TemplateStudio
      {...props}
      initialDocument={design.data.document ? JSON.stringify(design.data.document) : undefined}
      onSave={
        can("INVITATION_SEND")
          ? async (serialized) => {
              const saved = await saveInvitationDesign(
                api,
                weddingId,
                design.data.version,
                serialized,
              );
              cache.setQueryData(key, saved);
            }
          : undefined
      }
    />
  );
}
