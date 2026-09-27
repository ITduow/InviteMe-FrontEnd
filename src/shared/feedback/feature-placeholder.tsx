import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "./empty-state";
export function FeaturePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Coming in a future milestone"
        description="This area is not available yet."
      />
    </div>
  );
}
