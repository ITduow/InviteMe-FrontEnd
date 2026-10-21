"use client";
import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowUpRight, CalendarDays, Flower2, Plus, Users } from "lucide-react";
import { PageHeader } from "@/shared/components/page-header";
import { Pagination } from "@/shared/components/pagination";
import { SearchInput } from "@/shared/components/search-input";
import { ErrorState } from "@/shared/feedback/error-state";
import { Button } from "@/shared/ui/button";
import { useWeddings } from "../hooks/use-weddings";
import type { WeddingListSort } from "../api/wedding.api";

const WEDDING_PAGE_SIZE = 20;
const SORT_OPTIONS: { value: WeddingListSort; label: string }[] = [
  { value: "weddingDate", label: "Ngày tổ chức" },
  { value: "title", label: "Tên lễ cưới" },
  { value: "createdAt", label: "Ngày tạo" },
];

function WeddingListSkeleton() {
  return (
    <div role="status" aria-label="Đang tải danh sách lễ cưới">
      <span className="sr-only">Đang tải danh sách lễ cưới…</span>
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="overflow-hidden rounded-2xl border border-[#e8ddd2] bg-white/80"
          >
            <div className="aspect-[2/1] animate-pulse bg-[#f1e8df] motion-reduce:animate-none" />
            <div className="space-y-4 p-5">
              <div className="h-5 w-2/3 animate-pulse rounded bg-[#f1e8df] motion-reduce:animate-none" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-[#f1e8df] motion-reduce:animate-none" />
              <div className="h-10 animate-pulse rounded bg-[#f1e8df] motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeddingList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<WeddingListSort>("weddingDate");
  const weddings = useWeddings({ page, pageSize: WEDDING_PAGE_SIZE, search, sort });
  const hasSearch = search.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10 sm:space-y-10">
      <div className="flex flex-col gap-5 border-b border-[#e8ddd2] pb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
        <PageHeader
          title="Lễ cưới của bạn"
          description="Mỗi ngày vui bắt đầu từ một kế hoạch thật đẹp."
        />
        <Button asChild className="min-h-11 w-full rounded-xl px-5 shadow-sm sm:w-auto">
          <Link href="/weddings/new">
            <Plus aria-hidden="true" />
            Tạo lễ cưới
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[#e8ddd2] bg-white/70 p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="w-full sm:max-w-md">
          <SearchInput
            label="Tìm theo tên hoặc đường dẫn"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
        </div>
        <label className="flex w-full flex-col gap-1.5 text-sm font-medium sm:w-52">
          Sắp xếp theo
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as WeddingListSort);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-[#d9cabe] bg-[#fffdfa] px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {weddings.isError ? (
        <ErrorState error={weddings.error} retry={() => void weddings.refetch()} />
      ) : !weddings.data ? (
        <WeddingListSkeleton />
      ) : weddings.data.items.length === 0 ? (
        <section className="rounded-3xl border border-[#e8ddd2] bg-white/75 px-6 py-12 text-center shadow-sm sm:px-10 sm:py-16">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[#f5e9e5] text-[#8b5960]">
            <Flower2 className="size-7" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5960]">
            {hasSearch ? "Chưa tìm thấy" : "Không gian của hai bạn"}
          </p>
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            {hasSearch ? "Không có lễ cưới phù hợp" : "Ngày vui bắt đầu từ đây"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            {hasSearch
              ? "Thử một tên khác hoặc kiểm tra lại đường dẫn bạn đang tìm."
              : "Tạo workspace đầu tiên để lưu thông tin và bắt đầu chuẩn bị cho ngày trọng đại. Nếu bạn được mời làm co-host, hãy xác nhận lời mời bằng đúng tài khoản nhận email; wedding đã tham gia sẽ xuất hiện tại đây."}
          </p>
          {!hasSearch && (
            <Button asChild className="mt-6 min-h-11 rounded-xl px-5">
              <Link href="/weddings/new">
                <Plus aria-hidden="true" />
                Tạo lễ cưới
              </Link>
            </Button>
          )}
        </section>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:gap-6">
          {weddings.data.items.map((wedding) => (
            <article
              key={wedding.id}
              className="group overflow-hidden rounded-2xl border border-[#e8ddd2] bg-white/85 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#cdb6a5] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="relative flex aspect-[2/1] items-center justify-center overflow-hidden bg-[#f4ece5]">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(195,151,132,0.22),transparent_62%)]"
                />
                <div className="relative flex size-14 items-center justify-center rounded-full border border-[#d9cabe] bg-white/60 text-[#8b5960]">
                  <Flower2 className="size-6" aria-hidden="true" />
                </div>
                <span className="absolute bottom-3 left-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#806960]">
                  InviteMe · Wedding workspace
                </span>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <h2 className="min-w-0 font-display text-xl leading-snug tracking-tight text-[#49383a] sm:text-2xl">
                    {wedding.title}
                  </h2>
                  <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e8ddd2] text-[#80565b] transition group-hover:border-[#c99a9b] group-hover:bg-[#fbf2f0]">
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-5 grid gap-3 border-t border-[#eee5dc] pt-4 text-sm sm:grid-cols-2">
                  <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-4 shrink-0 text-[#986d70]" aria-hidden="true" />
                    <span className="truncate">
                      {wedding.weddingDate
                        ? format(parseISO(wedding.weddingDate), "d MMMM yyyy", { locale: vi })
                        : "Chưa thiết lập ngày"}
                    </span>
                  </p>
                  <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <Users className="size-4 shrink-0 text-[#986d70]" aria-hidden="true" />
                    <span>
                      {wedding.participantCount} đã xác nhận /{" "}
                      {wedding.maxCapacity || "Chưa thiết lập"}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/weddings/${encodeURIComponent(wedding.id)}/overview`}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d9cabe] bg-[#fffdfa] px-4 text-sm font-semibold text-[#604448] transition hover:border-[#bd9291] hover:bg-[#fbf2f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Mở workspace
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {weddings.data && weddings.data.totalCount > 0 && (
        <Pagination
          page={page}
          pageSize={weddings.data.pageSize}
          totalCount={weddings.data.totalCount}
          onPageChange={setPage}
          disabled={weddings.isFetching}
        />
      )}
    </div>
  );
}
