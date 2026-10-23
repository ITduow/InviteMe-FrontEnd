import { PermissionGuard } from "@/shared/components/permission-guard";
import { CheckInPermissionFallback, SeatLookupCounter } from "@/features/guests";
export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <PermissionGuard permission="CHECKIN_MANAGE" fallback={<CheckInPermissionFallback />}>
      <SeatLookupCounter weddingId={weddingId} />
    </PermissionGuard>
  );
}
