"use client";

import { PageHeader } from "@/shared/components/page-header";
import { EmptyState } from "./empty-state";
import { useTranslation } from "react-i18next";
export function FeaturePlaceholder({ title, description }: { title: string; description: string }) {
  const { t } = useTranslation("screens");
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState title={t("comingSoon")} description={t("notAvailableYet")} />
    </div>
  );
}
