import { SavedInvitation } from "@/features/template-studio";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <PermissionGuard
      permission="INVITATION_SEND"
      fallback={
        <EmptyState
          title="Access restricted"
          description="You do not have permission to view this section."
        />
      }
    >
      <section className="space-y-4">
        <h1 className="font-serif text-3xl">Thiệp mời</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Chỉnh preset xưng hô, lời mời và xem trước với từng khách ngay trong Edit Studio.
        </p>
        <SavedInvitation weddingId={weddingId} />
      </section>
    </PermissionGuard>
  );
}
