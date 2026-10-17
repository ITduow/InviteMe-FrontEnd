"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import { LoadingState } from "@/shared/feedback/loading-state";
import { ErrorState } from "@/shared/feedback/error-state";
import { getInvitationDesign } from "../api/design.api";
import { TemplateThumbnail } from "./template-thumbnail";
import { InvitationCover } from "./invitation-cover";
import { findTemplate } from "../templates/catalog";
import "@fontsource/eb-garamond/400.css";

export function SavedInvitation({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const { can } = usePermission();
  const design = useQuery({
    queryKey: ["invitation-design", weddingId],
    queryFn: ({ signal }) => getInvitationDesign(api, weddingId, signal),
  });
  if (design.isPending) return <LoadingState label="Đang tải thiệp đã lưu…" />;
  if (design.isError)
    return <ErrorState error={design.error} retry={() => void design.refetch()} />;
  const doc = design.data.document;
  const cover = doc?.nodes.ROOT?.props.cover;
  const template = findTemplate(doc?.templateId);
  return (
    <section
      className="max-w-3xl rounded-2xl border bg-card p-5 sm:p-7"
      aria-label="Thiệp đang sử dụng"
    >
      {doc ? (
        <div className="flex flex-col gap-6 sm:flex-row">
          <div
            className="w-60 shrink-0 overflow-hidden rounded-xl border bg-background"
            aria-hidden="true"
          >
            {cover?.enabled ? (
              <div className="relative h-[300px] w-60 overflow-hidden">
                <div
                  style={{
                    position: "relative",
                    width: 480,
                    height: 600,
                    transform: "scale(0.5)",
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}
                >
                  <InvitationCover config={cover} editing onOpen={() => {}} />
                </div>
              </div>
            ) : (
              <TemplateThumbnail document={doc} scale={0.5} height={300} />
            )}
          </div>
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">Thiệp đang sử dụng</p>
            <h2 className="font-display text-2xl">{template?.name ?? "Thiết kế tùy chỉnh"}</h2>
            <p className="text-sm">Đã lưu · Phiên bản {design.data.version}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Các link thiệp cá nhân sử dụng thiết kế này và lời mời theo từng khách.
            </p>
            {can("WEDDING_EDIT") && (
              <Button asChild>
                <Link href={`/weddings/${encodeURIComponent(weddingId)}/studio`}>
                  Chỉnh sửa thiệp
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-display text-2xl">Chưa có thiệp đã lưu</h2>
          <p className="text-sm text-muted-foreground">
            Chọn mẫu trong Studio, chỉnh sửa rồi bấm “Lưu & áp dụng” để dùng cho các link thiệp cá
            nhân.
          </p>
          {can("WEDDING_EDIT") && (
            <Button asChild>
              <Link href={`/weddings/${encodeURIComponent(weddingId)}/studio`}>Chọn mẫu thiệp</Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
