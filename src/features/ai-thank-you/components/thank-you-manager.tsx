"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/language-context";
import { formatDate } from "@/i18n/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { Button } from "@/shared/ui/button";
import {
  approveThankYouTemplate,
  editThankYouTemplate,
  generateThankYouTemplateOptions,
  getThankYouBatch,
  listThankYouGuests,
  listThankYouTemplates,
  previewThankYouTemplate,
  queueThankYouTemplateMessages,
  retryThankYouBatch,
  type ThankYouTemplate,
} from "../api/thank-you.api";

const tones = ["WARM", "FORMAL", "FRIENDLY"] as const;

function niceError(error: unknown, t: (key: string) => string) {
  if (error instanceof ApiError && error.backendCode === "AI_NOT_CONFIGURED")
    return t("errors.aiUnavailable");
  if (error instanceof ApiError && error.status === 429) return t("errors.rateLimited");
  if (error instanceof ApiError && error.status === 409) return t("errors.conflict");
  if (error instanceof ApiError && error.backendCode === "THANK_YOU_CONTACT_REQUIRED")
    return t("errors.contactRequired");
  return t("errors.generic");
}

export function ThankYouManager({ weddingId }: { weddingId: string }) {
  const { t } = useTranslation("thankYou");
  const { language } = useLocale();
  const { api } = useRuntime();
  const client = useQueryClient();
  const [guestPage, setGuestPage] = useState(1);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [tone, setTone] = useState<(typeof tones)[number]>("WARM");
  const [variantCount, setVariantCount] = useState<1 | 3>(3);
  const [includeGiftAmount, setIncludeGiftAmount] = useState(false);
  const [sendChannels, setSendChannels] = useState<string[]>(["EMAIL"]);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [content, setContent] = useState("");
  const [previewGuestId, setPreviewGuestId] = useState("");
  const [previewContent, setPreviewContent] = useState("");
  const [error, setError] = useState("");
  const [batchId, setBatchId] = useState("");

  const guests = useQuery({
    queryKey: ["thank-you-guests", weddingId, guestPage],
    queryFn: ({ signal }) => listThankYouGuests(api, weddingId, guestPage, signal),
  });
  const templates = useQuery({
    queryKey: ["thank-you-templates", weddingId],
    queryFn: ({ signal }) => listThankYouTemplates(api, weddingId, signal),
  });
  const activeTemplate = useMemo(
    () => templates.data?.items.find((template) => template.id === activeTemplateId),
    [templates.data, activeTemplateId],
  );
  const batch = useQuery({
    queryKey: ["thank-you-batch", weddingId, batchId],
    queryFn: ({ signal }) => getThankYouBatch(api, weddingId, batchId, signal),
    enabled: Boolean(batchId),
    refetchInterval: (query) => (query.state.data?.pendingCount ? 2500 : false),
  });

  const invalidateTemplates = () =>
    client.invalidateQueries({ queryKey: ["thank-you-templates", weddingId] });
  const generate = useMutation({
    mutationFn: () =>
      generateThankYouTemplateOptions(api, weddingId, {
        guestIds: selectedGuestIds,
        variantCount,
        tone,
        includeGiftAmount,
      }),
    onSuccess: async (options) => {
      setError("");
      setActiveTemplateId(options[0]?.id ?? "");
      setContent(options[0]?.content ?? "");
      setPreviewContent("");
      await invalidateTemplates();
    },
    onError: (reason) => setError(niceError(reason, t)),
  });
  const save = useMutation({
    mutationFn: () =>
      activeTemplate
        ? editThankYouTemplate(api, weddingId, activeTemplate.id, {
            content,
            expectedVersion: activeTemplate.version,
            includeGiftAmount: activeTemplate.includesGiftAmount,
          })
        : Promise.reject(new Error("Select a template")),
    onSuccess: async (template) => {
      setError("");
      setContent(template.content);
      await invalidateTemplates();
    },
    onError: (reason) => setError(niceError(reason, t)),
  });
  const approve = useMutation({
    mutationFn: () =>
      activeTemplate
        ? approveThankYouTemplate(api, weddingId, activeTemplate.id, activeTemplate.version)
        : Promise.reject(new Error("Select a template")),
    onSuccess: async () => {
      setError("");
      await invalidateTemplates();
    },
    onError: (reason) => setError(niceError(reason, t)),
  });
  const preview = useMutation({
    mutationFn: () =>
      activeTemplate && previewGuestId
        ? previewThankYouTemplate(api, weddingId, activeTemplate.id, previewGuestId)
        : Promise.reject(new Error("Select a template and recipient")),
    onSuccess: (result) => {
      setError("");
      setPreviewContent(result.renderedContent);
    },
    onError: (reason) => setError(niceError(reason, t)),
  });
  const send = useMutation({
    mutationFn: () =>
      activeTemplate
        ? queueThankYouTemplateMessages(
            api,
            weddingId,
            activeTemplate.id,
            selectedGuestIds,
            sendChannels,
            crypto.randomUUID(),
          )
        : Promise.reject(new Error("Select an approved template")),
    onSuccess: (result) => {
      setError("");
      setBatchId(result.id);
    },
    onError: (reason) => setError(niceError(reason, t)),
  });
  const retry = useMutation({
    mutationFn: () => retryThankYouBatch(api, weddingId, batchId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["thank-you-batch", weddingId, batchId] });
    },
  });

  function toggleGuest(id: string) {
    setSelectedGuestIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < 180 ? [...ids, id] : ids,
    );
  }
  function toggleChannel(channel: string) {
    setSendChannels((channels) =>
      channels.includes(channel) ? channels.filter((x) => x !== channel) : [...channels, channel],
    );
  }
  function selectTemplate(template: ThankYouTemplate) {
    setActiveTemplateId(template.id);
    setContent(template.content);
    setPreviewContent("");
    setError("");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="font-semibold">1. {t("createStepTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("createStepDescription")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">
            {t("tone")}
            <select
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
              value={tone}
              onChange={(event) => setTone(event.target.value as typeof tone)}
            >
              {tones.map((item) => (
                <option key={item} value={item}>
                  {t(`tones.${item}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            {t("variantCount")}
            <select
              className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
              value={variantCount}
              onChange={(event) => setVariantCount(Number(event.target.value) as 1 | 3)}
            >
              <option value={1}>{t("oneOption")}</option>
              <option value={3}>{t("threeOption")}</option>
            </select>
          </label>
          <label className="flex items-start gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={includeGiftAmount}
              onChange={(event) => setIncludeGiftAmount(event.target.checked)}
            />
            <span>{t("includeGiftAmount")}</span>
          </label>
        </div>
        {guests.isPending ? (
          <p role="status">{t("loadingGuests")}</p>
        ) : guests.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("guestsFailed")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  {["select", "guest", "group", "contact"].map((key) => (
                    <th key={key} className="px-3 py-2">
                      {t(`columns.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guests.data.items.map((guest) => (
                  <tr key={guest.id} className="border-t">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={t("selectGuest", { name: guest.recipientName })}
                        checked={selectedGuestIds.includes(guest.id)}
                        onChange={() => toggleGuest(guest.id)}
                      />
                    </td>
                    <td className="px-3 py-2">{guest.recipientName}</td>
                    <td className="px-3 py-2">{guest.group?.name ?? guest.side}</td>
                    <td className="px-3 py-2">{guest.email || guest.phone || t("noContact")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {guests.data && (
          <div className="flex items-center justify-between text-sm">
            <span>
              {t("selectionSummary", {
                count: selectedGuestIds.length,
                page: guestPage,
                pages: Math.max(1, Math.ceil(guests.data.totalItems / guests.data.pageSize)),
              })}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={guestPage <= 1}
                onClick={() => setGuestPage((page) => page - 1)}
              >
                {t("previous")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={guestPage * guests.data.pageSize >= guests.data.totalItems}
                onClick={() => setGuestPage((page) => page + 1)}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        )}
        <Button
          type="button"
          disabled={selectedGuestIds.length === 0 || generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? t("generating") : t("generateButton", { count: variantCount })}
        </Button>
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="font-semibold">2. {t("reviewStepTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("reviewStepDescription")}</p>
        </div>
        {templates.isPending ? (
          <p role="status">{t("loadingTemplates")}</p>
        ) : templates.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("templatesFailed")}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.25fr)]">
            <div className="max-h-[30rem] space-y-2 overflow-auto">
              {templates.data.items.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={`w-full rounded-lg border p-3 text-left ${template.id === activeTemplateId ? "border-primary bg-primary/5" : ""}`}
                >
                  <strong>{t(`tones.${template.tone}`)}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {template.status === "APPROVED" ? t("approvedReady") : t("draft")}
                    {template.usedFallback ? ` · ${t("fallback")}` : ""}
                    {template.includesGiftAmount ? ` · ${t("giftLineConditional")}` : ""}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDate(template.createdAt, language, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </button>
              ))}
              {templates.data.items.length === 0 && (
                <p className="rounded-lg bg-muted p-4 text-sm">{t("emptyTemplates")}</p>
              )}
            </div>
            <div className="space-y-3">
              {activeTemplate ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{t("sharedTemplate")}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t(`statuses.${activeTemplate.status}`)} ·{" "}
                        {t("version", { version: activeTemplate.version })}
                        {activeTemplate.includesGiftAmount
                          ? ` · ${t("giftLinePaidOnly")}`
                          : ` · ${t("noGiftAmount")}`}
                      </p>
                    </div>
                    {activeTemplate.status === "APPROVED" && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
                        {t("approved")}
                      </span>
                    )}
                  </div>
                  <textarea
                    aria-label={t("templateContent")}
                    className="min-h-64 w-full rounded-lg border bg-background p-3 text-sm leading-7"
                    maxLength={3000}
                    value={content}
                    readOnly={activeTemplate.status === "APPROVED"}
                    onChange={(event) => setContent(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("templatePlaceholderHint")} <code>{"{{GuestName}}"}</code>.{" "}
                    {activeTemplate.includesGiftAmount && (
                      <>
                        {t("giftPlaceholderHint")} <code>{"{{GiftThanks}}"}</code>.
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-sm">
                      {t("previewGuest")}
                      <select
                        className="mt-1 block min-w-56 rounded-md border bg-background px-3 py-2"
                        value={previewGuestId}
                        onChange={(event) => setPreviewGuestId(event.target.value)}
                      >
                        <option value="">{t("selectLoadedGuest")}</option>
                        {guests.data?.items.map((guest) => (
                          <option key={guest.id} value={guest.id}>
                            {guest.recipientName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!previewGuestId || preview.isPending}
                      onClick={() => preview.mutate()}
                    >
                      {preview.isPending ? t("previewing") : t("preview")}
                    </Button>
                  </div>
                  {previewContent && (
                    <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                      {previewContent}
                    </pre>
                  )}
                  {activeTemplate.status === "DRAFT" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={save.isPending}
                        onClick={() => save.mutate()}
                      >
                        {t("saveChanges")}
                      </Button>
                      <Button
                        type="button"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate()}
                      >
                        {t("approveTemplate")}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-lg bg-muted p-5 text-sm">{t("selectTemplateHint")}</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="font-semibold">3. {t("sendStepTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("sendStepDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium">{t("channelsLabel")}</span>
          {(["EMAIL", "SMS"] as const).map((channel) => (
            <label key={channel} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendChannels.includes(channel)}
                onChange={() => toggleChannel(channel)}
              />
              {channel === "EMAIL" ? "Email" : "SMS"}
            </label>
          ))}
        </div>
        <Button
          type="button"
          disabled={
            !activeTemplate ||
            activeTemplate.status !== "APPROVED" ||
            !selectedGuestIds.length ||
            !sendChannels.length ||
            send.isPending
          }
          onClick={() => send.mutate()}
        >
          {send.isPending ? t("queueing") : t("sendButton", { count: selectedGuestIds.length })}
        </Button>
      </section>

      {batchId && (
        <section className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">4. {t("deliveryStatus")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("batchSummary", {
                  id: batchId.slice(0, 8),
                  status: batch.data ? t(`statuses.${batch.data.status}`) : t("queued"),
                })}
              </p>
            </div>
            {batch.data?.failedCount ? (
              <Button
                type="button"
                variant="outline"
                disabled={retry.isPending}
                onClick={() => retry.mutate()}
              >
                {t("retryFailed")}
              </Button>
            ) : null}
          </div>
          {batch.isPending ? (
            <p>{t("loadingProgress")}</p>
          ) : batch.data ? (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>{t("sentCount", { count: batch.data.sentCount })}</span>
                <span>{t("failedCount", { count: batch.data.failedCount })}</span>
                <span>{t("pendingCount", { count: batch.data.pendingCount })}</span>
              </div>
              <div className="space-y-2">
                {batch.data.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/50 p-3 text-sm"
                  >
                    <span>
                      {job.channel} · {job.recipient}
                    </span>
                    <span>
                      {t(`statuses.${job.status}`, { defaultValue: job.status })}
                      {job.errorCode ? ` · ${job.errorCode}` : ""}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("deliveryHint")}</p>
            </>
          ) : null}
        </section>
      )}
    </div>
  );
}
