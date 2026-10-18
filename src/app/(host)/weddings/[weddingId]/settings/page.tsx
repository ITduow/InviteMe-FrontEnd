import { WeddingSetupForm } from "@/features/weddings";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";

export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <PermissionGuard
      permission="WEDDING_VIEW"
      fallback={
        <EmptyState
          title="Không có quyền truy cập"
          description="Bạn không có quyền xem thiết lập lễ cưới này."
        />
      }
    >
      <WeddingSetupForm weddingId={weddingId} />
    </PermissionGuard>
  );
}
