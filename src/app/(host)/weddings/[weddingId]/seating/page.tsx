import { FeaturePlaceholder } from "@/shared/feedback/feature-placeholder";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
export default function Page() {
  return (
    <PermissionGuard
      permission="SEATING_VIEW"
      fallback={
        <EmptyState
          title="Access restricted"
          description="You do not have permission to view this section."
        />
      }
    >
      <FeaturePlaceholder title="Seating" description="A thoughtful place for everyone." />
    </PermissionGuard>
  );
}
