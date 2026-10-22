import { WeddingAuditLog } from "@/features/audit";

export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return <WeddingAuditLog weddingId={weddingId} />;
}
