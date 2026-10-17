import { GuestInvitation } from "@/features/template-studio";
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestInvitation token={token} />;
}
