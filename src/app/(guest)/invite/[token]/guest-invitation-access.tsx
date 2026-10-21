"use client";

import { useState } from "react";
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
  const seats = useQuery({
    queryKey: ["guest-seats", token],
    queryFn: ({ signal }) => getGuestSeats(api, token, signal),
    enabled: open,
    retry: false,
    staleTime: 0,
  });
  const imageUrl = qrUrl(token);
  const downloadUrl = qrUrl(token, true);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQrFailed(false);
          setOpen(true);
        }}
        className="fixed bottom-4 right-4 z-[70] inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#5c3439] shadow-lg ring-1 ring-black/10 transition hover:bg-[#fff6f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c454c] sm:bottom-6 sm:right-6"
        aria-haspopup="dialog"
      >
        <QrCode aria-hidden="true" />
        QR & số bàn
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-access-title"
            className="my-auto max-h-[min(92dvh,52rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-[#fffafa] p-5 text-[#4a2c2f] shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#79565a]">
                  Dành riêng cho bạn
                </p>
                <h2 id="guest-access-title" className="mt-1 font-display text-2xl">
                  Mã QR & chỗ ngồi
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-[#ffdedd] focus-visible:outline-2 focus-visible:outline-[#7c454c]"
                aria-label="Đóng"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-[#ebc6c5] bg-white p-4 text-center">
              <h3 className="font-semibold">QR check-in cá nhân</h3>
              <p className="mt-1 text-sm text-[#79565a]">
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
                <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  {qrFailed
                    ? "Chưa tải được mã QR. Vui lòng thử lại sau."
                    : "Chưa cấu hình được địa chỉ API để tải mã QR."}
                </p>
              )}
              {downloadUrl && !qrFailed && (
                <a
                  href={downloadUrl}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#7c454c] px-4 text-sm font-semibold text-white hover:bg-[#63383e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c454c]"
                >
                  <Download aria-hidden="true" />
                  Tải QR dạng PNG
                </a>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-[#ebc6c5] bg-white p-4">
              <h3 className="font-semibold">Bàn của bạn</h3>
              {seats.isPending ? (
                <p className="mt-2 text-sm text-[#79565a]">Đang kiểm tra sơ đồ bàn…</p>
              ) : seats.isError ? (
                <div className="mt-2 space-y-2 text-sm">
                  <p role="alert" className="text-red-800">
                    {seats.error instanceof ApiError && seats.error.status === 404
                      ? "Liên kết khách mời không còn khả dụng."
                      : "Chưa tải được thông tin chỗ ngồi."}
                  </p>
                  <button type="button" onClick={() => void seats.refetch()} className="underline">
                    Thử tải lại
                  </button>
                </div>
              ) : !seats.data?.published ? (
                <p className="mt-2 text-sm text-[#79565a]">
                  Sơ đồ bàn chưa được công bố. Khi có thông tin, bàn sẽ hiện tại đây.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {seats.data.seats
                    .filter((seat) => seat.status !== "UNUSED")
                    .map((seat) => (
                      <p key={seat.position} className="rounded-lg bg-[#fff6f6] p-3 text-sm">
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
                    <p className="text-sm text-[#79565a]">
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
