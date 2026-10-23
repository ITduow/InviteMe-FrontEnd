import { BrandLogo } from "@/shared/components/brand-logo";

export function SessionLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải InviteMe…"
      className="fixed inset-0 z-[100] flex min-h-dvh flex-col items-center justify-center gap-6 bg-background text-foreground"
    >
      <BrandLogo size="xl" className="motion-safe:animate-pulse" />
      <span className="sr-only">Đang tải InviteMe…</span>
    </div>
  );
}
