"use client";

import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { getPublicThankYou } from "../api/thank-you.api";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/language-context";
import { formatDate } from "@/i18n/format";

export function GuestThankYouLetter({ token }: { token: string }) {
  const { t } = useTranslation("public");
  const { language } = useLocale();
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
            {t("thankYouLoading")}
          </p>
        ) : query.isError || !query.data ? (
          <>
            <h1 className="mt-6 text-center font-display text-3xl">{t("thankYouUnavailable")}</h1>
            <p className="mt-3 text-center text-sm text-[#79565a]">
              {t("thankYouUnavailableHint")}
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-center font-display text-3xl">
              {t("dearGuest", { name: query.data.guestName })}
            </h1>
            <div className="mt-8 whitespace-pre-wrap text-base leading-8">
              {query.data.content
                .replaceAll("{{GuestName}}", query.data.guestName)
                .replaceAll("{{GiftAmount}}", "")}
            </div>
            <p className="mt-8 text-right text-sm text-[#79565a]">
              {t("sentAt", {
                date: formatDate(query.data.sentAt, language, {
                  dateStyle: "long",
                  timeStyle: "short",
                }),
              })}
            </p>
          </>
        )}
      </article>
    </main>
  );
}
