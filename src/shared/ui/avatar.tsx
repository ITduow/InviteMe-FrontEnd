import type { ComponentProps } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function Avatar({
  name,
  placeholder = false,
  className,
  ...props
}: ComponentProps<"span"> & { name?: string; placeholder?: boolean }) {
  const initial = name?.trim().split(/\s+/).at(-1)?.slice(0, 1).toLocaleUpperCase("vi");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-xs font-semibold text-foreground",
        placeholder &&
          "border border-dashed border-foreground/25 bg-transparent text-muted-foreground",
        className,
      )}
      {...props}
    >
      {placeholder || !initial ? <Plus className="size-3.5" /> : initial}
    </span>
  );
}
