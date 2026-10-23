"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, QrCode, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { ApiError } from "@/core/api/api-error";
import { getGuestSeats } from "@/features/rsvp";

function qrUrl(token: string, download = false) {
  if (!env.apiUrl) return null;
  const url = new URL(`/api/guest-invitations/${encodeURIComponent(token)}/qr`, env.apiUrl);
  url.searchParams.set("format", "png");
  if (download) url.searchParams.set("download", "true");
  return url.toString();
}

export function GuestInvitationAccess({ token }: { token: string }) {
  const { api } = useRuntime();
  const [open, setOpen] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const seats = useQuery({
    queryKey: ["guest-seats", token],
    queryFn: ({ signal }) => getGuestSeats(api, token, signal),
    enabled: open,
    retry: false,
    staleTime: 0,
  });
  const imageUrl = qrUrl(token);
  const downloadUrl = qrUrl(token, true);

  useEffect(() => {
    if (!open) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
      );
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setQrFailed(false);
          setOpen(true);
        }}
        className="fixed bottom-4 right-4 z-[70] inline-flex min-h-12 items-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-foreground shadow-lg ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:bottom-6 sm:right-6"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="guest-access-dialog"
      >
        <QrCode aria-hidden="true" />
        QR & số bàn
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <section
            role="dialog"
            ref={dialogRef}
            id="guest-access-dialog"
            aria-modal="true"
            aria-labelledby="guest-access-title"
            className="my-auto max-h-[min(92dvh,52rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Dành riêng cho bạn
                </p>
                <h2 id="guest-access-title" className="mt-1 font-display text-2xl">
                  Mã QR & chỗ ngồi
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label="Đóng"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-card p-4 text-center">
              <h3 className="font-semibold">QR check-in cá nhân</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Lưu mã này vào điện thoại hoặc tải xuống để in và đưa tại quầy đón khách.
              </p>
              {imageUrl && !qrFailed ? (
                <Image
                  src={imageUrl}
                  alt="Mã QR thiệp mời cá nhân"
                  width={224}
                  height={224}
                  unoptimized
                  className="mx-auto mt-4 size-56 max-w-full rounded-lg bg-white object-contain p-2"
                  onError={() => setQrFailed(true)}
                />
              ) : (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-destructive/15 p-3 text-sm text-foreground"
                >
                  {qrFailed
                    ? "Chưa tải được mã QR. Vui lòng thử lại sau."
                    : "Chưa cấu hình được địa chỉ API để tải mã QR."}
                </p>
              )}
              {downloadUrl && !qrFailed && (
                <a
                  href={downloadUrl}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Download aria-hidden="true" />
                  Tải QR dạng PNG
                </a>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold">Bàn của bạn</h3>
              {seats.isPending ? (
                <p className="mt-2 text-sm text-muted-foreground">Đang kiểm tra sơ đồ bàn…</p>
              ) : seats.isError ? (
                <div className="mt-2 space-y-2 text-sm">
                  <p role="alert" className="text-foreground">
                    {seats.error instanceof ApiError && seats.error.status === 404
                      ? "Liên kết khách mời không còn khả dụng."
                      : "Chưa tải được thông tin chỗ ngồi."}
                  </p>
                  <button type="button" onClick={() => void seats.refetch()} className="underline">
                    Thử tải lại
                  </button>
                </div>
              ) : !seats.data?.published ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Sơ đồ bàn chưa được công bố. Khi có thông tin, bàn sẽ hiện tại đây.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {seats.data.seats
                    .filter((seat) => seat.status !== "UNUSED")
                    .map((seat) => (
                      <p key={seat.position} className="rounded-lg bg-muted p-3 text-sm">
                        <span className="font-medium">
                          {seat.personName ?? `Khách thứ ${seat.position}`}
                        </span>
                        <span>
                          {" · "}
                          {seat.table
                            ? `${seat.table}${seat.seatNumber ? `, ghế ${seat.seatNumber}` : ""}`
                            : "Chưa được xếp bàn"}
                        </span>
                      </p>
                    ))}
                  {seats.data.seats.every((seat) => seat.status === "UNUSED") && (
                    <p className="text-sm text-muted-foreground">
                      Hiện chưa có chỗ ngồi dành cho khách này.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
