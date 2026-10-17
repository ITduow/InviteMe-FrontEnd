import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
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
      <section className="space-y-4">
        <h1 className="font-serif text-3xl">Thiết kế thiệp</h1>
        <p className="text-sm text-muted-foreground">
          Thiết kế nội dung thiệp và lời mời cá nhân hóa cho wedding.
        </p>
        <Button asChild>
          <Link href={`/weddings/${encodeURIComponent(weddingId)}/studio`}>Mở Edit Studio</Link>
        </Button>
      </section>
    </PermissionGuard>
  );
}
