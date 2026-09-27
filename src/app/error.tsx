"use client";
import { ErrorState } from "@/shared/feedback/error-state";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="mx-auto max-w-3xl p-8">
      <ErrorState retry={reset} />
    </main>
  );
}
