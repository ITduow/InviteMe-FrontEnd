import Link from "next/link";
import { Flower2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl">
          <Flower2 className="size-6 text-primary" aria-hidden="true" />
          InviteMe
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm">
          <Link href="/pricing">Pricing</Link>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-6 py-12">
        {children}
      </main>
      <footer className="mx-auto max-w-6xl border-t px-6 py-8 text-sm text-muted-foreground">
        InviteMe · Made for meaningful celebrations.
      </footer>
    </div>
  );
}
