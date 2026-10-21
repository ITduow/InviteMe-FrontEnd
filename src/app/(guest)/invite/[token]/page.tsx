import { GuestInvitation } from "@/features/template-studio";
import { GuestInvitationAccess } from "./guest-invitation-access";
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <GuestInvitation token={token} />
      <GuestInvitationAccess token={token} />
    </>
  );
}
