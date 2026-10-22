"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1)
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toLocaleUpperCase("vi");
  return parts[0]?.slice(0, 2).toLocaleUpperCase("vi") || "U";
}

export function AccountAvatar({
  name,
  imageUrl,
  size = "compact",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "compact" | "large";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const sizeClass = size === "large" ? "size-20 text-xl" : "size-8 text-xs";
  let safeImageUrl: string | null = null;
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") safeImageUrl = imageUrl;
    } catch {
      safeImageUrl = null;
    }
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-medium text-primary ring-1 ring-primary/20",
        sizeClass,
      )}
    >
      {safeImageUrl && failedUrl !== safeImageUrl ? (
        <Image
          src={safeImageUrl}
          alt=""
          fill
          unoptimized
          sizes={size === "large" ? "80px" : "32px"}
          className="object-cover"
          onError={() => setFailedUrl(safeImageUrl)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
