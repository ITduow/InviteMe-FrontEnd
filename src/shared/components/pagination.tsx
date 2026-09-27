"use client";
import { Button } from "@/shared/ui/button";
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
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">
        Page {page} of {pages} · {totalCount} results
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
