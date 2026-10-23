"use client";

import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/shared/components/brand-logo";

export function SessionLoading({ label }: { label?: string }) {
  const { t } = useTranslation("common");
  const loadingLabel = label ?? t("loadingInviteMe");
  return (
    <div
      role="status"
      aria-label={loadingLabel}
      className="fixed inset-0 z-[100] flex min-h-dvh flex-col items-center justify-center gap-6 bg-background text-foreground"
    >
      <BrandLogo size="xl" className="motion-safe:animate-pulse" />
      <span className="sr-only">{loadingLabel}</span>
    </div>
  );
}
