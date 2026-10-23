"use client";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { useLocale } from "@/i18n/language-context";
import { formatNumber } from "@/i18n/format";
export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled = false,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("common");
  const { language } = useLocale();
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  return (
    <nav
      aria-label={t("paginationLabel")}
      className="flex flex-wrap items-center justify-between gap-4"
    >
      <span className="text-sm text-muted-foreground">
        {t("pagination", {
          current: formatNumber(page, language),
          total: formatNumber(pages, language),
          count: formatNumber(totalCount, language),
        })}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("previous")}
        </Button>
        <Button
          variant="outline"
          disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
        </Button>
      </div>
    </nav>
  );
}
