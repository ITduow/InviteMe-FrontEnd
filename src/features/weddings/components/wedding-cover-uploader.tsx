"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, ImageUp, Trash2, Upload } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { env } from "@/core/config/env";
import { ConfirmDialog } from "@/shared/feedback/confirm-dialog";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateWeddingCover(file: File) {
  if (!ACCEPTED_TYPES.has(file.type)) return "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "Ảnh vượt quá dung lượng tối đa 5 MB.";
  if (file.size === 0) return "Tệp ảnh trống. Vui lòng chọn ảnh khác.";
  return undefined;
}

export function resolveWeddingMediaUrl(value: string | null) {
  if (!value) return null;
  try {
    const base = env.apiUrl ? `${env.apiUrl.replace(/\/$/, "")}/` : undefined;
    return new URL(
      value,
      base ?? (typeof window === "undefined" ? "http://localhost" : window.location.origin),
    ).toString();
  } catch {
    return null;
  }
}

export function WeddingCoverUploader({
  currentUrl,
  disabled = false,
  busy = false,
  onUpload,
  onRemove,
  deferUpload = false,
  onSelect,
}: {
  currentUrl: string | null;
  disabled?: boolean;
  busy?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  deferUpload?: boolean;
  onSelect?: (file: File | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );
  const imageUrl = objectUrl ?? resolveWeddingMediaUrl(currentUrl);

  function selectFile(next: File | null) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = next ? URL.createObjectURL(next) : null;
    setObjectUrl(objectUrlRef.current);
    setFile(next);
    onSelect?.(next);
  }

  function acceptFile(next: File | null) {
    if (!next) return;
    setError(validateWeddingCover(next) ?? "");
    setNotice("");
    setPreviewError(false);
    selectFile(next);
  }

  async function upload() {
    if (!file) return;
    const validation = validateWeddingCover(file);
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setNotice("");
    try {
      await onUpload(file);
      selectFile(null);
      setPreviewError(false);
      setNotice("Ảnh bìa đã được cập nhật.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Không thể tải ảnh lên. Vui lòng thử lại.",
      );
    }
  }

  async function remove() {
    setError("");
    setNotice("");
    try {
      await onRemove();
      setNotice("Đã gỡ ảnh bìa.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Không thể gỡ ảnh bìa. Vui lòng thử lại.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && !busy) setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (!disabled && !busy) acceptFile(event.dataTransfer.files[0] ?? null);
        }}
        className={`rounded-2xl border border-dashed p-4 transition-colors sm:p-5 ${
          dragActive
            ? "border-[#a8757d] bg-[#fbf2f0]"
            : "border-[#d9cabe] bg-[#fffdfa] hover:border-[#bd9291]"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f6ece8] text-[#8b5960]">
              <ImageUp className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {file
                  ? "Ảnh đã chọn"
                  : currentUrl
                    ? "Ảnh bìa hiện tại"
                    : "Thêm ảnh bìa cho workspace"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Kéo ảnh vào đây hoặc chọn từ thiết bị · JPEG, PNG, WebP · tối đa 5 MB
              </p>
              {file && (
                <p className="mt-2 break-all text-xs font-medium text-[#604448]">{file.name}</p>
              )}
            </div>
          </div>
          <label className="inline-flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#d9cabe] bg-white px-4 text-sm font-semibold text-[#604448] transition hover:bg-[#fbf2f0] focus-within:ring-2 focus-within:ring-ring sm:w-auto">
            <ImagePlus aria-hidden="true" className="size-4" />
            {file || currentUrl ? "Chọn ảnh khác" : "Chọn ảnh"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Chọn ảnh bìa JPEG, PNG hoặc WebP"
              disabled={disabled || busy}
              onChange={(event) => {
                const next = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                acceptFile(next);
              }}
            />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {file && !deferUpload && (
          <Button
            type="button"
            className="min-h-11 rounded-xl px-4"
            onClick={() => void upload()}
            disabled={disabled || busy || Boolean(validateWeddingCover(file))}
          >
            <Upload aria-hidden="true" />
            {busy ? "Đang tải ảnh…" : "Tải ảnh lên"}
          </Button>
        )}
        {!file && currentUrl && (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-xl"
                disabled={disabled || busy}
              >
                <Trash2 aria-hidden="true" />
                Gỡ ảnh bìa
              </Button>
            }
            title="Gỡ ảnh bìa?"
            description="Ảnh hiện tại sẽ bị gỡ khỏi phần thiết lập lễ cưới."
            onConfirm={() => void remove()}
            cancelLabel="Giữ ảnh"
            confirmLabel="Gỡ ảnh"
          />
        )}
        {file && currentUrl && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 rounded-xl"
            disabled={busy}
            onClick={() => {
              selectFile(null);
              setError("");
            }}
          >
            Hủy thay ảnh
          </Button>
        )}
      </div>
      {imageUrl && !previewError ? (
        <div className="relative flex aspect-[16/8] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#e8ddd2] bg-[#f4ece5] p-2 sm:aspect-[16/7]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Xem trước ảnh bìa lễ cưới"
            onError={() => setPreviewError(true)}
            className="h-full w-full rounded-xl object-contain"
          />
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#604448] shadow-sm">
            Xem trước ảnh bìa
          </span>
        </div>
      ) : currentUrl && previewError ? (
        <p role="status" className="text-sm text-muted-foreground">
          Không tải được ảnh hiện tại. Bạn có thể chọn ảnh mới để thay thế.
        </p>
      ) : null}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-700">
          {notice}
        </p>
      )}
    </div>
  );
}
