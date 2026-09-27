import { FeaturePlaceholder } from "@/shared/feedback/feature-placeholder";
import { PermissionGuard } from "@/shared/components/permission-guard";
import { EmptyState } from "@/shared/feedback/empty-state";
export default function Page() {
  return (
    <PermissionGuard
      permission="CHECKIN_MANAGE"
      fallback={
        <EmptyState
          title="Access restricted"
          description="You do not have permission to view this section."
        />
      }
    >
      <FeaturePlaceholder title="Check-in" description="Welcome your guests on the day." />
    </PermissionGuard>
  );
}
