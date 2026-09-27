import type { ReactNode } from "react";
import { WeddingAccessBoundary } from "@/features/auth";
import { WeddingRealtime } from "@/features/weddings";
import { WeddingNavigation } from "@/shared/layout/wedding-navigation";
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  return (
    <WeddingAccessBoundary key={weddingId} weddingId={weddingId}>
      <div className="space-y-6">
        <WeddingRealtime weddingId={weddingId} />
        <WeddingNavigation weddingId={weddingId} />
        {children}
      </div>
    </WeddingAccessBoundary>
  );
}
