import { GuestDashboard } from "@/features/guests";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <PermissionGuard
      permission="GUEST_VIEW"
      fallback={
        <EmptyState
          title="Access restricted"
          description="You do not have permission to view this section."
        />
      }
    >
      <GuestDashboard key={weddingId} weddingId={weddingId} />
    </PermissionGuard>
  );
}
