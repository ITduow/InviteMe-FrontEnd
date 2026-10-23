import { cn } from "@/shared/lib/utils";
export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", {
        "bg-muted text-muted-foreground": tone === "neutral",
        "bg-success text-success-foreground": tone === "success",
        "bg-warning text-warning-foreground": tone === "warning",
        "bg-error-surface text-foreground": tone === "danger",
      })}
    >
      {label}
    </span>
  );
}
