"use client";
import { ApiError } from "@/core/api/api-error";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "react-i18next";
export function ErrorState({ error, retry }: { error?: unknown; retry?: () => void }) {
  const { t } = useTranslation("common");
  const errorMessage =
    error instanceof ApiError
      ? t(`apiErrors.${error.code}`, { defaultValue: t("unknownError") })
      : t("unknownError");
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-6">
      <h2 className="font-semibold">{t("requestFailedTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      {retry && (
        <Button variant="outline" className="mt-4" onClick={retry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
