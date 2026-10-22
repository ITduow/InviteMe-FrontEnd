"use client";

import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { getPublicThankYou } from "../api/thank-you.api";

export function GuestThankYouLetter({ token }: { token: string }) {
  const { api } = useRuntime();
  const query = useQuery({
    queryKey: ["public-thank-you", token],
    queryFn: ({ signal }) => getPublicThankYou(api, token, signal),
    retry: false,
  });
  return (
    <main className="mx-auto min-h-[70vh] max-w-2xl px-5 py-12 text-[#4a2c2f] sm:py-20">
      <article className="rounded-3xl border border-[#eadbd0] bg-[#fffdfa] p-7 shadow-sm sm:p-12">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#9a6b52]">
          {query.data?.weddingTitle ?? "InviteMe"}
        </p>
        {query.isPending ? (
          <p role="status" className="mt-8 text-center">
            Đang mở lời cảm ơn…
          </p>
        ) : query.isError || !query.data ? (
          <>
            <h1 className="mt-6 text-center font-display text-3xl">Thư chưa khả dụng</h1>
            <p className="mt-3 text-center text-sm text-[#79565a]">
              Liên kết không tồn tại hoặc thư chưa được gửi thành công.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-center font-display text-3xl">
              Thân gửi {query.data.guestName}
            </h1>
            <div className="mt-8 whitespace-pre-wrap text-base leading-8">
              {query.data.content
                .replaceAll("{{GuestName}}", query.data.guestName)
                .replaceAll("{{GiftAmount}}", "")}
            </div>
            <p className="mt-8 text-right text-sm text-[#79565a]">
              Gửi lúc{" "}
              {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short" }).format(
                new Date(query.data.sentAt),
              )}
            </p>
          </>
        )}
      </article>
    </main>
  );
}
