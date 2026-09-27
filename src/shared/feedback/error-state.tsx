"use client";
import { ApiError } from "@/core/api/api-error";
import { Button } from "@/shared/ui/button";
export function ErrorState({ error, retry }: { error?: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-6">
      <h2 className="font-semibold">We couldn’t complete that request</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error instanceof ApiError
          ? error.message
          : "Please try again. If the problem continues, come back later."}
      </p>
      {retry && (
        <Button variant="outline" className="mt-4" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
