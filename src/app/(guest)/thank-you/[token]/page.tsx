import { GuestThankYouLetter } from "@/features/ai-thank-you";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestThankYouLetter token={token} />;
}
