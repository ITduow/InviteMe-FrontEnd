"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/shared/feedback/empty-state";
import { Button } from "@/shared/ui/button";
export default function NotFound() {
  const { t } = useTranslation("common");
  return (
    <main id="main-content" className="mx-auto max-w-3xl p-8">
      <EmptyState
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        action={
          <Button asChild>
            <Link href="/">{t("backToInviteMe")}</Link>
          </Button>
        }
      />
    </main>
  );
}
