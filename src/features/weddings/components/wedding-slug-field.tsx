"use client";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { weddingSlugSchema, normalizeWeddingSlug } from "../schemas/wedding.schema";
import { checkWeddingSlug } from "../api/wedding.api";
import { weddingKeys } from "../api/wedding.keys";
import { Input } from "@/shared/ui/input";

export function WeddingSlugField({
  value,
  onChange,
  weddingId,
  initialSlug,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  weddingId?: string;
  initialSlug?: string;
  error?: string;
}) {
  const { api } = useRuntime();
  const normalized = normalizeWeddingSlug(value);
  const valid = weddingSlugSchema.safeParse(normalized).success;
  const unchanged = Boolean(weddingId && normalized === initialSlug);
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    if (!valid || unchanged) return;
    const timer = window.setTimeout(() => setDebounced(normalized), 500);
    return () => window.clearTimeout(timer);
  }, [normalized, valid, unchanged]);
  const availability = useQuery({
    queryKey: weddingKeys.slug(debounced, weddingId),
    queryFn: ({ signal }) => checkWeddingSlug(api, debounced, weddingId, signal),
    enabled: Boolean(debounced) && debounced === normalized,
    staleTime: 20_000,
    retry: false,
  });
  const baseUrl = env.appUrl || (typeof window === "undefined" ? "" : window.location.origin);
  const checking =
    valid && !unchanged && (!debounced || debounced !== normalized || availability.isFetching);
  const unavailable = valid && !unchanged && availability.data?.available === false;
  const available = valid && !unchanged && availability.data?.available === true;
  const statusMessage = unchanged
    ? "Đây là đường dẫn hiện tại."
    : !valid
      ? ""
      : checking
        ? "Đang kiểm tra đường dẫn…"
        : availability.isError
          ? "Chưa kiểm tra được. Vui lòng thử lại sau."
          : available
            ? "Đường dẫn có thể sử dụng."
            : unavailable
              ? "Đường dẫn này đã được sử dụng."
              : "";
  const statusTone =
    unavailable || (!unchanged && availability.isError) ? "text-destructive" : "text-[#486a53]";

  return (
    <div className="space-y-2">
      <label htmlFor="wedding-slug" className="text-sm font-medium">
        Đường dẫn thiệp cưới <span aria-hidden="true">*</span>
      </label>
      <div className="flex min-w-0 items-center overflow-hidden rounded-xl border border-[#d9cabe] bg-[#fffdfa] transition focus-within:border-[#bd9291] focus-within:ring-2 focus-within:ring-ring">
        <span className="shrink-0 border-r border-[#e8ddd2] bg-[#f8f1eb] px-3 py-3 text-sm text-muted-foreground">
          /wedding/
        </span>
        <Input
          id="wedding-slug"
          value={value}
          required
          aria-required="true"
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          onBlur={() => onChange(normalized)}
          autoComplete="off"
          maxLength={80}
          aria-invalid={Boolean(error || (valid && availability.data?.available === false))}
          aria-describedby="wedding-slug-help wedding-slug-status wedding-slug-error"
          className="h-12 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          placeholder="minh-lan-2026"
        />
      </div>
      <p id="wedding-slug-help" className="text-xs leading-5 text-muted-foreground">
        Dùng 3–80 ký tự: chữ thường không dấu, số và dấu gạch ngang. Đây là đường dẫn dự kiến; trang
        công khai cần được xuất bản riêng.
      </p>
      {baseUrl && valid && (
        <p className="break-all text-xs text-muted-foreground">
          Đường dẫn dự kiến: {baseUrl}/wedding/{normalized}
        </p>
      )}
      <p
        id="wedding-slug-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`flex min-h-5 items-center gap-2 text-sm ${statusTone}`}
      >
        {checking ? (
          <LoaderCircle
            className="size-4 motion-safe:animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : unavailable || (!unchanged && availability.isError) ? (
          <AlertCircle className="size-4" aria-hidden="true" />
        ) : available || unchanged ? (
          <CheckCircle2 className="size-4" aria-hidden="true" />
        ) : null}
        {statusMessage}
      </p>
      {error && (
        <p id="wedding-slug-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
