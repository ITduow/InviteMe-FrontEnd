"use client";
import Link from "next/link";
import { useState } from "react";
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

function formatWeddingDate(value: string | null, timeZone: string) {
  if (!value) return "Chưa thiết lập";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function weddingStatusLabel(status: string) {
  if (status === "DRAFT") return "Đang chuẩn bị";
  if (status === "PUBLISHED") return "Đã xuất bản";
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
  return (
    <section
      role="status"
      aria-label="Đang tải workspace lễ cưới"
      className="mx-auto max-w-6xl space-y-7 pb-10"
    >
      <span className="sr-only">Đang tải workspace lễ cưới…</span>
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
      title: "Khách mời",
      description: "Tra cứu khách và thông tin trong phạm vi được giao.",
      icon: Users,
    },
    {
      permission: "INVITATION_SEND" as const,
      slug: "invitations",
      title: "Thiệp mời",
      description: "Chuẩn bị và gửi thiệp theo quyền được cấp.",
      icon: Send,
    },
    {
      permission: "RSVP_VIEW" as const,
      slug: "rsvp",
      title: "Xác nhận tham dự",
      description: "Theo dõi phản hồi RSVP và danh sách chờ.",
      icon: ClipboardList,
    },
    {
      permission: "SEATING_VIEW" as const,
      slug: "seating",
      title: "Sơ đồ chỗ ngồi",
      description: can("SEATING_EDIT")
        ? "Sắp xếp bàn trong phạm vi được chủ tiệc giao."
        : "Chỉ xem sơ đồ trong phạm vi được chủ tiệc giao.",
      icon: Armchair,
    },
    {
      permission: "CHECKIN_MANAGE" as const,
      slug: "check-in",
      title: "Đón khách & check-in",
      description: "Tra cứu và xác nhận khách đến trong ngày cưới.",
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
        Tất cả lễ cưới
      </Link>

      {(searchParams.has("created") || searchParams.has("updated")) && (
        <p
          role="status"
          className="rounded-2xl border border-[#c9d8c9] bg-[#f2f7f1] p-4 text-sm font-medium text-[#385e42]"
        >
          {searchParams.has("created") ? "Đã tạo lễ cưới thành công." : "Đã lưu thông tin lễ cưới."}
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-[#e8ddd2] bg-[#fffdfa] shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-11">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5960]">
              <Flower2 className="size-4" aria-hidden="true" />
              InviteMe · Wedding workspace
            </p>
            <h1 className="mt-5 break-words font-display text-3xl leading-tight tracking-tight text-[#49383a] sm:text-4xl lg:text-[2.75rem]">
              {data.name}
            </h1>
            <div className="mt-6 space-y-3 border-l-2 border-[#d8b7ad] pl-4">
              <p className="flex items-start gap-3 text-sm leading-6 text-[#604e4f] sm:text-base">
                <CalendarDays className="mt-1 size-4 shrink-0 text-[#986d70]" aria-hidden="true" />
                {formatWeddingDate(data.eventDateTime, data.timeZoneId)}
              </p>
              <p className="flex items-start gap-3 text-sm leading-6 text-[#604e4f] sm:text-base">
                <MapPin className="mt-1 size-4 shrink-0 text-[#986d70]" aria-hidden="true" />
                {data.venueName || "Chưa thiết lập địa điểm"}
              </p>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {canEditSetup && (
                <Button asChild className="min-h-11 rounded-xl px-5 shadow-sm">
                  <Link href={`/weddings/${encodeURIComponent(weddingId)}/settings`}>
                    <PencilLine aria-hidden="true" />
                    Chỉnh sửa thông tin
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="min-h-11 rounded-xl px-5">
                <Link href="/weddings">Danh sách lễ cưới</Link>
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
                alt={`Ảnh bìa ${data.name}`}
                onError={() => setCoverFailed(true)}
                className="relative h-full max-h-[26rem] w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="relative flex h-full min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-white/80 bg-white/35 px-6 text-center sm:min-h-72">
                <span className="flex size-16 items-center justify-center rounded-full border border-[#d9cabe] bg-white/75 text-[#8b5960] shadow-sm">
                  <Flower2 className="size-7" aria-hidden="true" />
                </span>
                <p className="mt-4 font-display text-xl text-[#604448]">Một ngày thật đáng nhớ</p>
                <p className="mt-2 max-w-xs text-sm leading-5 text-muted-foreground">
                  {coverFailed
                    ? "Không tải được ảnh bìa. Bạn có thể thử chọn ảnh khác trong phần thiết lập."
                    : "Ảnh bìa chưa được thêm. Bạn có thể chọn ảnh trong phần thiết lập."}
                </p>
                {canEditSetup && (
                  <Link
                    href={`/weddings/${encodeURIComponent(weddingId)}/settings`}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#704b50] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Thêm ảnh bìa <ArrowUpRight className="size-4" aria-hidden="true" />
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
            Thông tin đã lưu
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-tight text-[#49383a]">
            Chi tiết ngày vui
          </h2>
        </div>
        <span className="rounded-full border border-[#e8ddd2] bg-white/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Trạng thái: {weddingStatusLabel(data.status)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewDetail
          icon={CalendarDays}
          label="Ngày và giờ"
          value={formatWeddingDate(data.eventDateTime, data.timeZoneId)}
          detail={`Múi giờ ${data.timeZoneId}`}
        />
        <OverviewDetail
          icon={MapPin}
          label="Địa điểm"
          value={data.venueName || "Chưa thiết lập"}
          detail={data.venueAddress || "Chưa có địa chỉ"}
        />
        <OverviewDetail
          icon={Users}
          label="Sức chứa"
          value={data.capacity === null ? "Chưa thiết lập" : `${data.capacity} khách`}
        />
        <OverviewDetail
          icon={CalendarDays}
          label="Hạn xác nhận tham dự"
          value={formatWeddingDate(data.rsvpDeadline, data.timeZoneId)}
        />
        <OverviewDetail
          icon={ArrowUpRight}
          label="Đường dẫn dự kiến"
          value={`/wedding/${data.slug}`}
          detail="Trang công khai cần được xuất bản riêng trước khi khách có thể xem."
        />
      </div>
      {!access?.isOwner && access && (
        <section className="space-y-5 rounded-2xl border border-[#e8ddd2] bg-white/80 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b5960]">
              Không gian Co-host
            </p>
            <h2 className="mt-1 font-display text-xl text-[#49383a]">Công việc được giao</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mở trực tiếp khu vực bạn được chủ tiệc phân quyền. Mỗi thao tác vẫn được máy chủ kiểm
              tra theo phạm vi đã cấp.
            </p>
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
              Tài khoản này mới có quyền vào workspace. Hãy nhờ chủ tiệc cấp quyền khách mời, RSVP,
              sơ đồ chỗ ngồi hoặc check-in để bắt đầu công việc.
            </p>
          )}
          {can("SEATING_EDIT") && !can("SEATING_VIEW") && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              Bạn được cấp quyền sửa chỗ ngồi nhưng chưa có quyền xem sơ đồ. Hãy nhờ chủ tiệc cấp
              thêm quyền xem với phạm vi bao phủ các nhóm được sửa.
            </p>
          )}
          {can("SEATING_VIEW") && !can("SEATING_EDIT") && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              Bạn đang có quyền xem sơ đồ. Muốn sắp xếp bàn, hãy nhờ chủ tiệc cấp thêm quyền chỉnh
              sửa chỗ ngồi trong cùng phạm vi.
            </p>
          )}
          <div>
            <h3 className="font-semibold text-[#49383a]">Phạm vi quyền hiện tại</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {access.permissions.map((permission) => {
                const scope = access.scopes?.find((item) => item.permission === permission);
                const label: Record<string, string> = {
                  WEDDING_VIEW: "Thông tin đám cưới & realtime",
                  WEDDING_EDIT: "Chỉnh sửa thiết lập đám cưới",
                  GUEST_VIEW: "Xem khách mời",
                  GUEST_EDIT: "Sửa khách mời",
                  INVITATION_SEND: "Gửi thiệp mời",
                  RSVP_VIEW: "Xem phản hồi RSVP",
                  SEATING_VIEW: "Xem sơ đồ bàn",
                  SEATING_EDIT: "Sắp xếp bàn và chỗ ngồi",
                  CHECKIN_MANAGE: "Tra cứu và check-in",
                  GIFT_VIEW: "Xem sổ mừng cưới",
                  GIFT_EDIT: "Quản lý sổ mừng cưới",
                  ANALYTICS_VIEW: "Xem thống kê",
                };
                const scopeText =
                  permission === "CHECKIN_MANAGE" || scope?.weddingWide
                    ? "Toàn đám cưới"
                    : scope?.groups.length
                      ? scope.groups.map((group) => group.name).join(", ")
                      : "Đang tải phạm vi quyền";
                return (
                  <li
                    key={permission}
                    className="rounded-xl border border-[#eee5de] bg-[#fffdfa] p-3"
                  >
                    <p className="font-medium text-[#49383a]">{label[permission] ?? permission}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{scopeText}</p>
                  </li>
                );
              })}
            </ul>
            {!access.permissions.length && (
              <p className="rounded-lg bg-[#f8f3ef] p-3 text-sm text-muted-foreground">
                Chưa có quyền nghiệp vụ nào được cấp ngoài quyền vào workspace.
              </p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
