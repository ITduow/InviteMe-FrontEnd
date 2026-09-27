"use client";
import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/shared/components/page-header";
import { DataTable } from "@/shared/components/data-table";
import { Pagination } from "@/shared/components/pagination";
import { SearchInput } from "@/shared/components/search-input";
import { EmptyState } from "@/shared/feedback/empty-state";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { useWeddings } from "../hooks/use-weddings";
export function WeddingList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const weddings = useWeddings({ page, pageSize: 20, search });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Your weddings"
        description="A shared space for every detail of your day."
      />
      <SearchInput
        label="Search weddings"
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />
      {weddings.isError ? (
        <ErrorState error={weddings.error} retry={() => void weddings.refetch()} />
      ) : !weddings.data ? (
        <LoadingState />
      ) : weddings.data.items.length === 0 ? (
        <EmptyState
          title="No weddings found"
          description="Your weddings will appear here once they are available."
        />
      ) : (
        <DataTable
          caption="Your weddings"
          rows={weddings.data.items}
          rowKey={(row) => row.id}
          columns={[
            {
              id: "title",
              header: "Wedding",
              cell: (row) => (
                <Link
                  className="font-medium underline-offset-4 hover:underline"
                  href={`/weddings/${encodeURIComponent(row.id)}/overview`}
                >
                  {row.title}
                </Link>
              ),
            },
            {
              id: "date",
              header: "Date",
              cell: (row) =>
                row.weddingDate ? format(parseISO(row.weddingDate), "dd MMM yyyy") : "Not set",
            },
            {
              id: "participants",
              header: "Participants / capacity",
              cell: (row) => `${row.participantCount} / ${row.maxCapacity}`,
            },
          ]}
        />
      )}
      {weddings.data && (
        <Pagination
          page={page}
          pageSize={20}
          totalCount={weddings.data.totalCount}
          onPageChange={setPage}
          disabled={weddings.isFetching}
        />
      )}
    </div>
  );
}
