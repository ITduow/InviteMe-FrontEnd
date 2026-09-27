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
        "bg-emerald-50 text-emerald-800": tone === "success",
        "bg-amber-50 text-amber-800": tone === "warning",
        "bg-red-50 text-red-800": tone === "danger",
      })}
    >
      {label}
    </span>
  );
}
