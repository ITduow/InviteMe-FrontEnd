import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/utils";

const tones = {
  neutral: "border-foreground/10 bg-foreground/5 text-muted-foreground",
  success: "border-success/50 bg-success text-success-foreground",
  danger: "border-error-surface/50 bg-error-surface text-foreground",
  accent: "border-primary/30 bg-primary/10 text-foreground",
};

export function Chip({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[10px] font-medium leading-none whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
