"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { GuestGiftPanel } from "@/features/gifts";

export function GuestGiftOverlay({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("inviteme:open-gift", show);
    return () => window.removeEventListener("inviteme:open-gift", show);
  }, []);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-gift-title"
        className="my-auto max-h-[min(92dvh,52rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mừng cưới & lời chúc
            </p>
            <h2 id="guest-gift-title" className="mt-1 text-xl font-semibold">
              Gửi quà mừng
            </h2>
          </div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full hover:bg-muted"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <GuestGiftPanel token={token} />
      </section>
    </div>
  );
}
