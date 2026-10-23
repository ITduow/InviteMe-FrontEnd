"use client";
import { useId } from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { useTranslation } from "react-i18next";
export function SearchInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const { t } = useTranslation("common");
  const id = useId();
  const searchLabel = label ?? t("search");
  return (
    <div className="relative max-w-md">
      <label htmlFor={id} className="sr-only">
        {searchLabel}
      </label>
      <Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
      <Input
        id={id}
        type="search"
        className="pl-10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={searchLabel}
      />
    </div>
  );
}
