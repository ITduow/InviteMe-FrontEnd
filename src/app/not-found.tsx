import Link from "next/link";
import { EmptyState } from "@/shared/feedback/empty-state";
import { Button } from "@/shared/ui/button";
export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl p-8">
      <EmptyState
        title="This page couldn’t be found"
        description="The link may be incomplete or no longer available."
        action={
          <Button asChild>
            <Link href="/">Back to InviteMe</Link>
          </Button>
        }
      />
    </main>
  );
}
