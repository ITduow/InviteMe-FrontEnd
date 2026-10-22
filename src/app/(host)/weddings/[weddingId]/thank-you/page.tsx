import { use } from "react";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
import { ThankYouManager } from "@/features/ai-thank-you";

export default function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = use(params);
  return (
    <PermissionGuard
      permission="GUEST_VIEW"
      fallback={
        <EmptyState
          title="Access restricted"
          description="Only the wedding owner can manage thank-you letters."
        />
      }
    >
      <ThankYouManager weddingId={weddingId} />
    </PermissionGuard>
  );
}
