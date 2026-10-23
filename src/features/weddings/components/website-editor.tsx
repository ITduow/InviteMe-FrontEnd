"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, ImagePlus, LoaderCircle, MonitorPlay, Palette, X } from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { getWeddingSetup } from "../api/wedding.api";
import { weddingKeys } from "../api/wedding.keys";
import {
  getWebsite,
  listWeddingMedia,
  mediaUrl,
  publishWebsite,
  saveWebsite,
  unpublishWebsite,
  uploadWeddingMedia,
  websiteTemplates,
  type Website,
  type WebsiteDocument,
} from "../api/website.api";
import { WebsiteRenderer } from "./website-renderer";
import {
  WEDDING_TIME_ZONE,
  isoToLocalDateTime,
  localDateTimeToIso,
} from "../schemas/wedding.schema";
import { usePermission } from "@/shared/components/permission-guard";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/i18n/format";
import { useLanguage } from "@/i18n/language-context";

const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground/80 focus:border-primary-hover focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60";
const sectionClass = "rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-6";

function initialHero(url: string | null) {
  if (!url) return null;
  if (url.startsWith("/media/wedding-covers/")) return url;
  try {
    const source = new URL(url);
    return env.apiUrl &&
      source.origin === new URL(env.apiUrl).origin &&
      source.pathname.startsWith("/media/")
      ? source.pathname
      : null;
  } catch {
    return null;
  }
}

function statusLabel(status: Website["status"], t: (key: string) => string) {
  if (status === "PUBLISHED") return t("published");
  if (status === "UNPUBLISHED") return t("unpublished");
  return t("draft");
}

function WebsiteForm({
  weddingId,
  site,
  slug,
  fallback,
}: {
  weddingId: string;
  site: Website;
  slug: string;
  fallback: WebsiteDocument;
}) {
  const { t } = useTranslation("weddings", { keyPrefix: "websiteEditor" });
  const { language } = useLanguage();
  const { api } = useRuntime();
  const cache = useQueryClient();
  const [draft, setDraft] = useState<WebsiteDocument>(site.document ?? fallback);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(site.version);
  const [status, setStatus] = useState(site.status);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(site.hasUnpublishedChanges);
  const [savedDocument, setSavedDocument] = useState(site.document);
  const media = useQuery({
    queryKey: ["wedding-media", weddingId],
    queryFn: () => listWeddingMedia(api, weddingId),
  });
  const set = <K extends keyof WebsiteDocument>(key: K, value: WebsiteDocument[K]) => {
    if (!busy) setDraft((current) => ({ ...current, [key]: value }));
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDocument);
  const remoteChanged = site.version !== version;
  const scheduleWarnings = [
    ...(Math.abs(Date.parse(draft.eventAt) - Date.parse(fallback.eventAt)) >= 60000
      ? [t("dateMismatch")]
      : []),
    ...(draft.venueName.trim().toLowerCase() !== fallback.venueName.trim().toLowerCase() ||
    draft.venueAddress.trim().toLowerCase() !== fallback.venueAddress.trim().toLowerCase()
      ? [t("venueMismatch")]
      : []),
  ];

  function load(result: Website) {
    setVersion(result.version);
    setStatus(result.status);
    setHasUnpublishedChanges(result.hasUnpublishedChanges);
    setDraft(result.document ?? fallback);
    setSavedDocument(result.document);
  }

  const url = `${env.appUrl?.replace(/\/$/, "") ?? ""}/wedding/${slug}`;

  async function run(action: () => Promise<Website>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      load(result);
      cache.setQueryData(["website", weddingId], result);
      setMessage(success);
    } catch {
      setMessage(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const result = await uploadWeddingMedia(api, weddingId, file);
      setDraft((current) => ({ ...current, heroImageUrl: result.url }));
      void media.refetch();
      setMessage(t("uploadSuccess"));
    } catch {
      setMessage(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset disabled={busy} className="min-w-0 space-y-6 pb-24 sm:pb-10">
      <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-hover">
            {t("websiteInfo")}
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            {t("websiteInfo")}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
                status === "PUBLISHED"
                  ? "bg-success/45 text-success-foreground"
                  : status === "UNPUBLISHED"
                    ? "bg-warning/45 text-warning-foreground"
                    : "bg-petal text-primary-hover",
              )}
            >
              {status === "PUBLISHED" ? <Check className="size-3.5" aria-hidden="true" /> : null}
              {statusLabel(status, t)}
            </span>
            {(dirty || hasUnpublishedChanges) && (
              <span className="inline-flex min-h-7 items-center rounded-full bg-warning/35 px-3 text-xs font-medium text-warning-foreground">
                {t("unsavedChanges")}
              </span>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant={preview ? "default" : "outline"}
          className="min-h-11 w-full shrink-0 rounded-xl sm:w-auto"
          onClick={() => setPreview((value) => !value)}
        >
          {preview ? <X aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {preview ? t("closePreview") : t("previewDraft")}
        </Button>
      </header>

      {remoteChanged && (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-warning/70 bg-warning/20 p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>{t("remoteChanged")}</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-10 shrink-0 rounded-lg bg-card"
            onClick={() => load(site)}
          >
            {t("loadLatest")}
          </Button>
        </div>
      )}

      {scheduleWarnings.map((warning) => (
        <p
          role="alert"
          className="rounded-xl border border-warning/60 bg-warning/20 p-3 text-sm leading-6 text-warning-foreground"
          key={warning}
        >
          {warning}
        </p>
      ))}

      {preview ? (
        <section aria-label={t("previewAria")} className={sectionClass}>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <MonitorPlay className="size-4 text-primary-hover" aria-hidden="true" />
            {t("unpublishedPreview")}
          </div>
          <WebsiteRenderer document={draft} preview />
        </section>
      ) : (
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.85fr)] xl:gap-6">
          <section
            aria-labelledby="website-content-title"
            className={cn(sectionClass, "space-y-5")}
          >
            <div className="border-b border-border/70 pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-hover">
                {t("pageContent")}
              </p>
              <h3 id="website-content-title" className="mt-1 font-display text-2xl text-foreground">
                {t("weddingInfo")}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("publicInfoHelp")}</p>
            </div>

            <label className="block text-sm font-medium">
              {t("pageTitle")}
              <input
                className={fieldClass}
                maxLength={160}
                value={draft.title}
                onChange={(event) => set("title", event.target.value)}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                {t("partnerOne")}
                <input
                  className={fieldClass}
                  maxLength={100}
                  value={draft.partnerOne}
                  onChange={(event) => set("partnerOne", event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                {t("partnerTwo")}
                <input
                  className={fieldClass}
                  maxLength={100}
                  value={draft.partnerTwo}
                  onChange={(event) => set("partnerTwo", event.target.value)}
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              {t("story")}
              <textarea
                className={cn(fieldClass, "min-h-36 resize-y leading-6")}
                rows={6}
                maxLength={5000}
                value={draft.story}
                onChange={(event) => set("story", event.target.value)}
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                {t("max5000")}
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                {t("dateTime")}
                <input
                  className={fieldClass}
                  type="datetime-local"
                  value={isoToLocalDateTime(draft.eventAt, draft.timeZoneId ?? WEDDING_TIME_ZONE)}
                  onChange={(event) =>
                    set(
                      "eventAt",
                      event.target.value
                        ? localDateTimeToIso(
                            event.target.value,
                            draft.timeZoneId ?? WEDDING_TIME_ZONE,
                          )
                        : "",
                    )
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                {t("publicContact")}
                <input
                  className={fieldClass}
                  maxLength={200}
                  value={draft.contact ?? ""}
                  onChange={(event) => set("contact", event.target.value || null)}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                {t("venueName")}
                <input
                  className={fieldClass}
                  maxLength={200}
                  value={draft.venueName}
                  onChange={(event) => set("venueName", event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                {t("address")}
                <input
                  className={fieldClass}
                  maxLength={300}
                  value={draft.venueAddress}
                  onChange={(event) => set("venueAddress", event.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-background p-4 sm:flex-row sm:gap-6">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input
                  className="size-4 accent-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  type="checkbox"
                  checked={draft.showStory}
                  onChange={(event) => set("showStory", event.target.checked)}
                />
                {t("showStory")}
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input
                  className="size-4 accent-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  type="checkbox"
                  checked={draft.showEvent}
                  onChange={(event) => set("showEvent", event.target.checked)}
                />
                {t("showEvent")}
              </label>
            </div>

            <div className="space-y-4 border-t border-border/70 pt-5">
              <div>
                <h4 className="font-display text-xl text-foreground">{t("storyTimeline")}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{t("storyTimelineHelp")}</p>
              </div>
              {(draft.timeline ?? []).map((item, index) => (
                <article
                  key={index}
                  className="rounded-xl border border-border/80 bg-background p-3 sm:p-4"
                >
                  <label className="block text-sm font-medium">
                    {t("milestoneTitle")}
                    <input
                      className={fieldClass}
                      maxLength={120}
                      value={item.title}
                      onChange={(event) =>
                        set(
                          "timeline",
                          (draft.timeline ?? []).map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, title: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="mt-3 block text-sm font-medium">
                    {t("content")}
                    <textarea
                      className={cn(fieldClass, "min-h-24 resize-y leading-6")}
                      maxLength={1000}
                      value={item.description}
                      onChange={(event) =>
                        set(
                          "timeline",
                          (draft.timeline ?? []).map((entry, itemIndex) =>
                            itemIndex === index
                              ? { ...entry, description: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 min-h-10 px-2 text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      set(
                        "timeline",
                        (draft.timeline ?? []).filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    {t("removeMilestone")}
                  </Button>
                </article>
              ))}
              <Button
                type="button"
                variant="outline"
                className="min-h-10 rounded-lg"
                disabled={(draft.timeline?.length ?? 0) >= 12}
                onClick={() =>
                  set("timeline", [...(draft.timeline ?? []), { title: "", description: "" }])
                }
              >
                {t("addMilestone")}
              </Button>
            </div>

            <div className="space-y-4 border-t border-border/70 pt-5">
              <div>
                <h4 className="font-display text-xl text-foreground">{t("ceremonies")}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{t("ceremoniesHelp")}</p>
              </div>
              {(draft.events ?? []).map((item, index) => (
                <article
                  key={index}
                  className="rounded-xl border border-border/80 bg-background p-3 sm:p-4"
                >
                  <label className="block text-sm font-medium">
                    {t("ceremonyName")}
                    <input
                      className={fieldClass}
                      maxLength={120}
                      value={item.name}
                      onChange={(event) =>
                        set(
                          "events",
                          (draft.events ?? []).map((entry, itemIndex) =>
                            itemIndex === index ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      {t("time")}
                      <input
                        className={fieldClass}
                        type="datetime-local"
                        value={isoToLocalDateTime(
                          item.startsAt,
                          draft.timeZoneId ?? WEDDING_TIME_ZONE,
                        )}
                        onChange={(event) =>
                          set(
                            "events",
                            (draft.events ?? []).map((entry, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...entry,
                                    startsAt: event.target.value
                                      ? localDateTimeToIso(
                                          event.target.value,
                                          draft.timeZoneId ?? WEDDING_TIME_ZONE,
                                        )
                                      : "",
                                  }
                                : entry,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      {t("address")}
                      <input
                        className={fieldClass}
                        maxLength={300}
                        value={item.address}
                        onChange={(event) =>
                          set(
                            "events",
                            (draft.events ?? []).map((entry, itemIndex) =>
                              itemIndex === index
                                ? { ...entry, address: event.target.value }
                                : entry,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 min-h-10 px-2 text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      set(
                        "events",
                        (draft.events ?? []).filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    {t("removeCeremony")}
                  </Button>
                </article>
              ))}
              <Button
                type="button"
                variant="outline"
                className="min-h-10 rounded-lg"
                disabled={(draft.events?.length ?? 0) >= 10}
                onClick={() =>
                  set("events", [
                    ...(draft.events ?? []),
                    { name: "", startsAt: draft.eventAt, address: "" },
                  ])
                }
              >
                {t("addCeremony")}
              </Button>
            </div>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-20">
            <section aria-labelledby="website-theme-title" className={sectionClass}>
              <div className="mb-4 flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-petal text-primary-hover">
                  <Palette className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 id="website-theme-title" className="font-display text-xl text-foreground">
                    {t("websiteTheme")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t("themeHelp")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {websiteTemplates.map((template) => {
                  const selected = draft.templateId === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => set("templateId", template.id)}
                      aria-pressed={selected}
                      className={cn(
                        "group min-h-28 overflow-hidden rounded-xl border-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected
                          ? "border-primary-hover shadow-[0_0_0_3px_var(--petal)]"
                          : "border-border hover:border-primary/80",
                      )}
                    >
                      <span
                        className="flex h-16 items-center justify-center px-3"
                        style={{ backgroundColor: template.background }}
                        aria-hidden="true"
                      >
                        <span className="flex w-full items-center gap-2">
                          <span
                            className="h-px flex-1"
                            style={{ backgroundColor: template.color }}
                          />
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: template.color }}
                          />
                          <span
                            className="h-px flex-1"
                            style={{ backgroundColor: template.color }}
                          />
                        </span>
                      </span>
                      <span className="flex min-h-10 items-center justify-between gap-2 px-3 text-sm font-medium">
                        <span className="truncate">{template.name}</span>
                        {selected && (
                          <Check
                            className="size-4 shrink-0 text-primary-hover"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="website-media-title" className={sectionClass}>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-hover">
                  {t("images")}
                </p>
                <h3 id="website-media-title" className="mt-1 font-display text-xl text-foreground">
                  {t("coverAndGallery")}
                </h3>
              </div>

              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/80 bg-background px-4 py-4 text-center transition hover:bg-petal/50 focus-within:ring-2 focus-within:ring-ring">
                <ImagePlus className="size-5 text-primary-hover" aria-hidden="true" />
                <span className="text-sm font-medium">{t("uploadImage")}</span>
                <span className="text-xs text-muted-foreground">{t("imageFormats")}</span>
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                    event.target.value = "";
                  }}
                />
              </label>

              {media.isPending ? (
                <p className="mt-4 text-sm text-muted-foreground">{t("loadingImages")}</p>
              ) : media.isError ? (
                <p role="status" className="mt-4 text-sm text-muted-foreground">
                  {t("imagesLoadFailed")}
                </p>
              ) : media.data?.length ? (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {media.data.map((item, index) => {
                    const selected = draft.heroImageUrl === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`${selected ? t("coverSelected") : t("selectCover")}, ${t("imageNumber", { number: formatNumber(index + 1, language) })}`}
                        aria-pressed={selected}
                        onClick={() => set("heroImageUrl", item.url)}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-lg border-2 bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          selected
                            ? "border-primary-hover"
                            : "border-transparent hover:border-primary/80",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(item.url)} alt="" className="size-full object-cover" />
                        {selected && (
                          <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-card text-primary-hover shadow-sm">
                            <Check className="size-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {draft.heroImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 min-h-10 px-2 text-sm text-muted-foreground"
                  onClick={() => set("heroImageUrl", null)}
                >
                  {t("removeCover")}
                </Button>
              )}

              <div className="mt-5 border-t border-border/70 pt-4">
                <div>
                  <h4 className="font-semibold text-foreground">{t("gallery")}</h4>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{t("galleryHelp")}</p>
                </div>
                {media.data?.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                    {media.data.map((item, index) => (
                      <button
                        key={`album-${item.id}`}
                        type="button"
                        disabled={(draft.gallery?.length ?? 0) >= 30}
                        onClick={() => set("gallery", [...(draft.gallery ?? []), item.url])}
                        className="aspect-square overflow-hidden rounded-lg border border-border bg-background transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t("addGalleryImage", {
                          number: formatNumber(index + 1, language),
                        })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(item.url)} alt="" className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
                {(draft.gallery ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(draft.gallery ?? []).map((src, index) => (
                      <button
                        key={`${src}-${index}`}
                        type="button"
                        onClick={() =>
                          set(
                            "gallery",
                            (draft.gallery ?? []).filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-2.5 text-xs text-muted-foreground transition hover:border-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t("removeGalleryImage", {
                          number: formatNumber(index + 1, language),
                        })}
                      >
                        {t("galleryImage", { number: formatNumber(index + 1, language) })}
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(59,32,43,0.06)] backdrop-blur sm:static sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 sm:mx-0">
          <Button
            type="button"
            className="min-h-11 flex-1 rounded-xl sm:flex-none"
            disabled={busy || remoteChanged || !dirty}
            onClick={() =>
              void run(() => saveWebsite(api, weddingId, version, draft), t("savedDraftMessage"))
            }
          >
            {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : null}
            {busy ? t("processing") : t("saveDraft")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 rounded-xl bg-card sm:flex-none"
            disabled={
              busy ||
              remoteChanged ||
              version === 0 ||
              dirty ||
              (!hasUnpublishedChanges && status === "PUBLISHED")
            }
            onClick={() =>
              void run(() => publishWebsite(api, weddingId, version), t("publishSuccess"))
            }
          >
            {status === "PUBLISHED" ? t("publishChanges") : t("publish")}
          </Button>
          {status === "PUBLISHED" && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1 rounded-xl bg-card sm:flex-none"
              disabled={busy || dirty || remoteChanged}
              onClick={() =>
                void run(() => unpublishWebsite(api, weddingId, version), t("unpublishSuccess"))
              }
            >
              {t("unpublish")}
            </Button>
          )}
          {status === "PUBLISHED" && (
            <a
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-sm font-medium text-primary-hover underline-offset-4 hover:bg-petal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              {t("openWebsite")}
            </a>
          )}
          {status === "PUBLISHED" && (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 flex-1 rounded-xl sm:flex-none"
              onClick={() =>
                void navigator.clipboard.writeText(new URL(url, window.location.origin).toString())
              }
            >
              {t("copyLink")}
            </Button>
          )}
        </div>
        {message && (
          <p
            role="status"
            className="mx-auto mt-2 max-w-7xl text-center text-sm sm:ml-0 sm:text-left"
          >
            {message}
          </p>
        )}
      </div>
    </fieldset>
  );
}

export function WebsiteEditor({ weddingId }: { weddingId: string }) {
  const { t } = useTranslation("weddings", { keyPrefix: "websiteEditor" });
  const { api } = useRuntime();
  const { isOwner } = usePermission();
  const site = useQuery({
    queryKey: ["website", weddingId],
    queryFn: ({ signal }) => getWebsite(api, weddingId, signal),
    enabled: isOwner,
  });
  const wedding = useQuery({
    queryKey: weddingKeys.detail(weddingId),
    queryFn: ({ signal }) => getWeddingSetup(api, weddingId, signal),
  });

  if (!isOwner) {
    return (
      <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {t("permissionRequired")}
      </p>
    );
  }
  if (site.isPending || wedding.isPending) {
    return (
      <div role="status" className="space-y-4" aria-label={t("loadingWebsite")}>
        <span className="sr-only">{t("loadingWebsiteText")}</span>
        <div className="h-9 w-56 animate-pulse rounded-lg bg-petal motion-reduce:animate-none" />
        <div className="h-20 rounded-2xl bg-card motion-safe:animate-pulse motion-reduce:animate-none" />
        <div className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="h-[40rem] rounded-2xl bg-card motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-[28rem] rounded-2xl bg-card motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    );
  }
  if (site.isError || wedding.isError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-destructive/30 bg-error-surface/10 p-5 text-sm text-destructive"
      >
        {t("loadFailed")}
      </div>
    );
  }

  const setup = wedding.data;
  const fallback: WebsiteDocument = {
    templateId: "story-red-velvet",
    title: setup.name,
    partnerOne: "",
    partnerTwo: "",
    story: "",
    eventAt: setup.eventDateTime ?? new Date().toISOString(),
    venueName: setup.venueName ?? "",
    venueAddress: setup.venueAddress ?? "",
    heroImageUrl: initialHero(setup.coverImageUrl),
    showStory: true,
    showEvent: true,
    contact: null,
    timeline: [],
    events: [],
    gallery: [],
    timeZoneId: setup.timeZoneId ?? WEDDING_TIME_ZONE,
  };
  return (
    <WebsiteForm
      key={weddingId}
      weddingId={weddingId}
      site={site.data}
      slug={setup.slug}
      fallback={fallback}
    />
  );
}
