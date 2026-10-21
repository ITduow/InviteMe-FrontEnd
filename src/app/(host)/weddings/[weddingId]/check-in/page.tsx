import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
import { SeatLookupCounter } from "@/features/guests";
export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <PermissionGuard
      permission="CHECKIN_MANAGE"
      fallback={
        <EmptyState
            title="Không đủ quyền check-in"
            description="Quầy check-in cần quyền CHECKIN_MANAGE trong wedding này. Việc mở màn hình hoặc tra cứu QR không thể ghi nhận khách đã đến."
        />
      }
    >
      <SeatLookupCounter weddingId={weddingId} />
    </PermissionGuard>
  );
}
