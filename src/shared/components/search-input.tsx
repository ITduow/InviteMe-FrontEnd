"use client";
import { useId } from "react";
import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
export function SearchInput({
  value,
  onChange,
  label = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const id = useId();
  return (
    <div className="relative max-w-md">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
      <Input
        id={id}
        type="search"
        className="pl-10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
      />
    </div>
  );
}
