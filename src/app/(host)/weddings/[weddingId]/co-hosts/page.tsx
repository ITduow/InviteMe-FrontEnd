import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
import { CoHostManagement } from "@/features/co-hosts";
export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <PermissionGuard
      permission="WEDDING_EDIT"
      fallback={
        <EmptyState
          title="Access restricted"
          description="You do not have permission to view this section."
        />
      }
    >
      <CoHostManagement weddingId={weddingId} />
    </PermissionGuard>
  );
}
