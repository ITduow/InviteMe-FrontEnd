"use client";

import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { ErrorState } from "@/shared/feedback/error-state";
import { LoadingState } from "@/shared/feedback/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { sideLabels } from "../api/planning.api";
import { getCheckInSummary } from "../api/check-in-summary.api";

const sideLabel = (side: string) => sideLabels[side as keyof typeof sideLabels] ?? side;

export function CheckInOverview({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const summary = useQuery({
    queryKey: ["check-in-summary", weddingId],
    queryFn: ({ signal }) => getCheckInSummary(api, weddingId, signal),
  });

  if (summary.isPending) return <LoadingState label="Đang tải tổng quan check-in…" />;
  if (summary.isError)
    return <ErrorState error={summary.error} retry={() => void summary.refetch()} />;

  const data = summary.data;
  const stats = [
    { label: "Đã check-in", value: data.checkedIn },
    { label: "Chỗ dự kiến", value: data.expectedPlaces },
    { label: "Đã xác nhận RSVP", value: data.checkedInConfirmed },
    { label: "Đến chưa RSVP", value: data.checkedInWithoutRsvp },
    { label: "Ngoại lệ RSVP", value: data.checkedInExceptions },
    { label: "Khách vãng lai", value: data.checkedInWalkIns },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Tổng quan check-in"
        description="Số người đã đến được cập nhật lại định kỳ và khi có thay đổi check-in."
      />
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Theo phía khách</h2>
        {!data.bySide.length ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu check-in.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Phía</th>
                  <th className="px-3 py-2 font-medium">Đã đến</th>
                  <th className="px-3 py-2 font-medium">Dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {data.bySide.map((item) => (
                  <tr key={item.side} className="border-b last:border-0">
                    <th scope="row" className="px-3 py-3 font-medium">
                      {sideLabel(item.side)}
                    </th>
                    <td className="px-3 py-3 tabular-nums">{item.checkedIn}</td>
                    <td className="px-3 py-3 tabular-nums">{item.expectedPlaces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
