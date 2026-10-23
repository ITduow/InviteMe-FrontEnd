"use client";

import { useTranslation } from "react-i18next";
import { EmptyState } from "@/shared/feedback/empty-state";

export function CheckInPermissionFallback() {
  const { t } = useTranslation("guests", { keyPrefix: "checkIn" });
  return <EmptyState title={t("permissionTitle")} description={t("permissionDescription")} />;
}
