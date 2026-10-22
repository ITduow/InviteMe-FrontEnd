import { use } from "react";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
import { CoupleGiftManager } from "@/features/gifts";

export default function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = use(params);
  return (
    <PermissionGuard
      permission="GIFT_VIEW"
      fallback={
        <EmptyState
          title="Access restricted"
          description="You do not have permission to view this section."
        />
      }
    >
      <CoupleGiftManager weddingId={weddingId} />
    </PermissionGuard>
  );
}
