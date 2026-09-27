import { redirect } from "next/navigation";
export default async function WeddingPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  redirect(`/weddings/${encodeURIComponent(weddingId)}/overview`);
}
