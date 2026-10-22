import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
import { RsvpReminderCenter } from "@/features/rsvp";

export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <PermissionGuard
      permission="RSVP_VIEW"
      fallback={
        <EmptyState
          title="Access restricted"
          description="You do not have permission to view RSVP reminders in this wedding."
        />
      }
    >
      <RsvpReminderCenter weddingId={weddingId} />
    </PermissionGuard>
  );
}
