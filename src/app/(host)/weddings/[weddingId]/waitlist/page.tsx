import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
import { HostRsvpQueues } from "@/features/rsvp";
export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <PermissionGuard
      permission="RSVP_VIEW"
      fallback={
        <EmptyState
          title="Access restricted"
          description="You do not have permission to view this section."
        />
      }
    >
      <HostRsvpQueues weddingId={weddingId} />
    </PermissionGuard>
  );
}
