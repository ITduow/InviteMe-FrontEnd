import { WebsiteEditor } from "@/features/weddings";
export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return <WebsiteEditor weddingId={weddingId} />;
}
