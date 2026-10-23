import { InvitationTemplatePicker } from "@/app/_components/invitation-template-picker";

export default async function Page({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return <InvitationTemplatePicker weddingId={weddingId} />;
}
