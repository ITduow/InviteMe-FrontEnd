import { Flower2 } from "lucide-react";

export function SessionLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải InviteMe…"
      className="fixed inset-0 z-[100] flex min-h-dvh flex-col items-center justify-center gap-6 bg-background text-foreground"
    >
      <div className="flex items-center gap-3 motion-safe:animate-pulse" aria-hidden="true">
        <Flower2 className="size-9 text-primary" strokeWidth={1.5} />
        <span className="font-display text-4xl tracking-tight sm:text-5xl">InviteMe</span>
      </div>
      <span className="sr-only">Đang tải InviteMe…</span>
    </div>
  );
}
