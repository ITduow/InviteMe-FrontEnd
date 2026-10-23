"use client";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Armchair,
  CalendarDays,
  ClipboardList,
  Flower2,
  MapPin,
  PencilLine,
  ScanLine,
  Send,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import { getWeddingSetup } from "../api/wedding.api";
import { weddingKeys } from "../api/wedding.keys";
import { resolveWeddingMediaUrl } from "./wedding-cover-uploader";
import { useLocale } from "@/i18n/language-context";
import { formatDate, formatNumber } from "@/i18n/format";

function formatWeddingDate(
  value: string | null,
  timeZone: string,
  language: "vi" | "en",
  t: (key: string) => string,
) {
  if (!value) return t("notSet");
  return formatDate(value, language, { dateStyle: "long", timeStyle: "short", timeZone });
}

function weddingStatusLabel(status: string, t: (key: string) => string) {
  if (status === "DRAFT") return t("statusDraft");
  if (status === "PUBLISHED") return t("statusPublished");
  return status;
}

function OverviewDetail({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e8ddd2] bg-white/80 p-5 shadow-sm sm:p-6">
      <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[#f6ece8] text-[#8b5960]">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words font-medium leading-6 text-[#49383a]">{value}</p>
      {detail && (
        <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">{detail}</p>
      )}
    </article>
  );
}

function WeddingOverviewSkeleton() {
  const { t } = useTranslation("weddings");
  return (
    <section
      role="status"
      aria-label={t("loadingOverview")}
      className="mx-auto max-w-6xl space-y-7 pb-10"
    >
      <span className="sr-only">{t("loadingOverview")}</span>
      <div
        aria-hidden="true"
        className="h-4 w-32 animate-pulse rounded bg-[#e8ddd2] motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="grid overflow-hidden rounded-3xl border border-[#e8ddd2] bg-white/80 lg:grid-cols-2"
      >
        <div className="space-y-5 p-7 sm:p-10">
          <div className="h-3 w-44 animate-pulse rounded bg-[#e8ddd2] motion-reduce:animate-none" />
          <div className="h-12 w-4/5 animate-pulse rounded bg-[#e8ddd2] motion-reduce:animate-none" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-[#e8ddd2] motion-reduce:animate-none" />
          <div className="h-11 w-48 animate-pulse rounded-xl bg-[#e8ddd2] motion-reduce:animate-none" />
        </div>
        <div
          aria-hidden="true"
          className="min-h-64 animate-pulse bg-[#f4ece5] motion-reduce:animate-none sm:min-h-80"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-40 animate-pulse rounded-2xl border border-[#e8ddd2] bg-white/80 motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  );
}

export function WeddingOverview({ weddingId }: { weddingId: string }) {
  const { t } = useTranslation("weddings");
  const { language } = useLocale();
  const [coverFailed, setCoverFailed] = useState(false);
  const searchParams = useSearchParams();
  const { api } = useRuntime();
  const { can, access } = usePermission();
  const canEditSetup = access?.isOwner === true && can("WEDDING_EDIT");
  const wedding = useQuery({
    queryKey: weddingKeys.detail(weddingId),
    queryFn: ({ signal }) => getWeddingSetup(api, weddingId, signal),
  });
  if (wedding.isPending) return <WeddingOverviewSkeleton />;
  if (wedding.isError)
    return <ErrorState error={wedding.error} retry={() => void wedding.refetch()} />;
  const data = wedding.data;
  const cover = resolveWeddingMediaUrl(data.coverImageUrl);
  const coHostWorkAreas = [
    {
      permission: "GUEST_VIEW" as const,
      slug: "guests",
      title: t("areaGuests"),
      description: t("areaGuestsDescription"),
      icon: Users,
    },
    {
      permission: "INVITATION_SEND" as const,
      slug: "invitations",
      title: t("areaInvitations"),
      description: t("areaInvitationsDescription"),
      icon: Send,
    },
    {
      permission: "RSVP_VIEW" as const,
      slug: "rsvp",
      title: t("areaRsvp"),
      description: t("areaRsvpDescription"),
      icon: ClipboardList,
    },
    {
      permission: "SEATING_VIEW" as const,
      slug: "seating",
      title: t("areaSeating"),
      description: can("SEATING_EDIT")
        ? t("areaSeatingEditDescription")
        : t("areaSeatingViewDescription"),
      icon: Armchair,
    },
    {
      permission: "CHECKIN_MANAGE" as const,
      slug: "check-in",
      title: t("areaCheckIn"),
      description: t("areaCheckInDescription"),
      icon: ScanLine,
    },
  ].filter((area) => can(area.permission));

  return (
    <section className="mx-auto max-w-6xl space-y-7 pb-10 sm:space-y-9">
      <Link
        href="/weddings"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("weddingList")}
      </Link>

      {(searchParams.has("created") || searchParams.has("updated")) && (
        <p
          role="status"
          className="rounded-2xl border border-[#c9d8c9] bg-[#f2f7f1] p-4 text-sm font-medium text-[#385e42]"
        >
          {searchParams.has("created") ? t("createdSuccessfully") : t("weddingSaved")}
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-[#e8ddd2] bg-[#fffdfa] shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-11">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5960]">
              <Flower2 className="size-4" aria-hidden="true" />
              {t("workspaceEyebrow")}
            </p>
            <h1 className="mt-5 break-words font-display text-3xl leading-tight tracking-tight text-[#49383a] sm:text-4xl lg:text-[2.75rem]">
              {data.name}
            </h1>
            <div className="mt-6 space-y-3 border-l-2 border-[#d8b7ad] pl-4">
              <p className="flex items-start gap-3 text-sm leading-6 text-[#604e4f] sm:text-base">
                <CalendarDays className="mt-1 size-4 shrink-0 text-[#986d70]" aria-hidden="true" />
                {formatWeddingDate(data.eventDateTime, data.timeZoneId, language, t)}
              </p>
              <p className="flex items-start gap-3 text-sm leading-6 text-[#604e4f] sm:text-base">
                <MapPin className="mt-1 size-4 shrink-0 text-[#986d70]" aria-hidden="true" />
                {data.venueName || t("venueNotSet")}
              </p>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {canEditSetup && (
                <Button asChild className="min-h-11 rounded-xl px-5 shadow-sm">
                  <Link href={`/weddings/${encodeURIComponent(weddingId)}/settings`}>
                    <PencilLine aria-hidden="true" />
                    {t("editWeddingDetails")}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="min-h-11 rounded-xl px-5">
                <Link href="/weddings">{t("weddingList")}</Link>
              </Button>
            </div>
          </div>

          <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-[#f3ebe4] p-4 sm:min-h-80 sm:p-6 lg:min-h-[26rem]">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(195,151,132,0.24),transparent_62%)]"
            />
            {cover && !coverFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={t("coverFor", { name: data.name })}
                onError={() => setCoverFailed(true)}
                className="relative h-full max-h-[26rem] w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="relative flex h-full min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-white/80 bg-white/35 px-6 text-center sm:min-h-72">
                <span className="flex size-16 items-center justify-center rounded-full border border-[#d9cabe] bg-white/75 text-[#8b5960] shadow-sm">
                  <Flower2 className="size-7" aria-hidden="true" />
                </span>
                <p className="mt-4 font-display text-xl text-[#604448]">{t("memorableDay")}</p>
                <p className="mt-2 max-w-xs text-sm leading-5 text-muted-foreground">
                  {coverFailed ? t("coverLoadFailedHint") : t("coverMissingHint")}
                </p>
                {canEditSetup && (
                  <Link
                    href={`/weddings/${encodeURIComponent(weddingId)}/settings`}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#704b50] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("addCover")} <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e8ddd2] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b5960]">
            {t("savedInformation")}
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-tight text-[#49383a]">
            {t("weddingDetails")}
          </h2>
        </div>
        <span className="rounded-full border border-[#e8ddd2] bg-white/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {t("weddingStatus", { status: weddingStatusLabel(data.status, t) })}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewDetail
          icon={CalendarDays}
          label={t("eventDateTime")}
          value={formatWeddingDate(data.eventDateTime, data.timeZoneId, language, t)}
          detail={t("timeZone", { zone: data.timeZoneId })}
        />
        <OverviewDetail
          icon={MapPin}
          label={t("venue")}
          value={data.venueName || t("notSet")}
          detail={data.venueAddress || t("addressNotSet")}
        />
        <OverviewDetail
          icon={Users}
          label={t("capacity")}
          value={
            data.capacity === null
              ? t("notSet")
              : t("guestCapacity", { count: formatNumber(data.capacity, language) })
          }
        />
        <OverviewDetail
          icon={CalendarDays}
          label={t("rsvpDeadline")}
          value={formatWeddingDate(data.rsvpDeadline, data.timeZoneId, language, t)}
        />
        <OverviewDetail
          icon={ArrowUpRight}
          label={t("plannedUrl")}
          value={`/wedding/${data.slug}`}
          detail={t("publicPageMustBePublished")}
        />
      </div>
      {!access?.isOwner && access && (
        <section className="space-y-5 rounded-2xl border border-[#e8ddd2] bg-white/80 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b5960]">
              {t("cohostWorkspace")}
            </p>
            <h2 className="mt-1 font-display text-xl text-[#49383a]">{t("assignedWork")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("assignedWorkDescription")}</p>
          </div>
          {coHostWorkAreas.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {coHostWorkAreas.map((area) => {
                  const Icon = area.icon;
                  return (
                    <Link
                      key={area.slug}
                      href={`/weddings/${encodeURIComponent(weddingId)}/${area.slug}`}
                      className="group rounded-xl border border-[#eee5de] bg-[#fffdfa] p-4 transition hover:border-[#cdb6a5] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex size-10 items-center justify-center rounded-lg bg-[#f6ece8] text-[#8b5960]">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="mt-3 flex items-center gap-2 font-semibold text-[#49383a]">
                        {area.title}
                        <ArrowUpRight
                          className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                        {area.description}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-[#d9cabe] bg-[#fffdfa] p-4 text-sm leading-6 text-muted-foreground">
              {t("noAssignedWork")}
            </p>
          )}
          {can("SEATING_EDIT") && !can("SEATING_VIEW") && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              {t("seatingEditNeedsView")}
            </p>
          )}
          {can("SEATING_VIEW") && !can("SEATING_EDIT") && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              {t("seatingViewOnly")}
            </p>
          )}
          <div>
            <h3 className="font-semibold text-[#49383a]">{t("currentPermissionScope")}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {access.permissions.map((permission) => {
                const scope = access.scopes?.find((item) => item.permission === permission);
                const label = t(`permissions.${permission}`);
                const scopeText =
                  permission === "CHECKIN_MANAGE" || scope?.weddingWide
                    ? t("wholeWedding")
                    : scope?.groups.length
                      ? scope.groups.map((group) => group.name).join(", ")
                      : t("loadingPermissionScope");
                return (
                  <li
                    key={permission}
                    className="rounded-xl border border-[#eee5de] bg-[#fffdfa] p-3"
                  >
                    <p className="font-medium text-[#49383a]">{label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{scopeText}</p>
                  </li>
                );
              })}
            </ul>
            {!access.permissions.length && (
              <p className="rounded-lg bg-[#f8f3ef] p-3 text-sm text-muted-foreground">
                {t("noBusinessPermissions")}
              </p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
