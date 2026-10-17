"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import { CoupleImport } from "./couple-import";
import {
  importBody,
  importGuests,
  listPlanningGuests,
  getPlanningGuest,
  sideLabels,
} from "../api/planning.api";
import type { CoupleRow } from "../utils/couple-import";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";

export function PlanningDashboard({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const { can } = usePermission();
  const cache = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  async function copyInvitation(path: string) {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setNotice("Đã sao chép link thiệp cá nhân.");
    } catch {
      setNotice("Không sao chép được link. Hãy cấp quyền clipboard và thử lại.");
    }
  }
  const attempt = useRef<{ serialized: string; key: string } | null>(null);
  const list = useQuery({
    queryKey: ["guest-planning", weddingId, page, search],
    queryFn: ({ signal }) => listPlanningGuests(api, weddingId, page, search, signal),
    enabled: can("GUEST_VIEW") && !importing,
  });
  const detail = useQuery({
    queryKey: ["guest-planning-detail", weddingId, selected],
    queryFn: ({ signal }) => getPlanningGuest(api, weddingId, selected ?? "", signal),
    enabled: !!selected && can("GUEST_VIEW"),
  });
  async function save(rows: CoupleRow[]) {
    const body = importBody(rows),
      serialized = JSON.stringify(body);
    if (attempt.current?.serialized !== serialized)
      attempt.current = { serialized, key: crypto.randomUUID() };
    const result = await importGuests(api, weddingId, body, attempt.current.key);
    setNotice(
      `Đã nhập ${result.createdGuestCount} đầu mối · ${result.createdPlaceCount} người dự kiến.${result.warnings.length ? ` Có ${result.warnings.length} dòng có thể trùng tên/SĐT; vẫn giữ riêng.` : ""}`,
    );
    await cache.invalidateQueries({ queryKey: ["guest-planning", weddingId] });
    setPage(1);
    setSearch("");
    setImporting(false);
    attempt.current = null;
  }
  if (importing) return <CoupleImport onClose={() => setImporting(false)} onImport={save} />;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl">Danh sách khách mời</h1>
        {can("SEATING_VIEW") && (
          <Button variant="outline" asChild>
            <Link href={`/weddings/${weddingId}/seating`}>Xếp chỗ ngồi</Link>
          </Button>
        )}
        {can("GUEST_EDIT") && (
          <Button
            onClick={() => {
              attempt.current = null;
              setImporting(true);
            }}
          >
            Nhập Excel / CSV
          </Button>
        )}
      </div>
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          {notice}
        </p>
      )}
      {!can("GUEST_VIEW") ? (
        <p>Bạn không có quyền xem danh sách khách.</p>
      ) : (
        <>
          <input
            aria-label="Tìm người nhận"
            placeholder="Tìm tên người nhận…"
            className="w-full rounded-lg border p-3"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {list.isPending && <p role="status">Đang tải danh sách…</p>}
          {list.isError && (
            <div role="alert">
              Không tải được danh sách.{" "}
              <Button variant="outline" onClick={() => void list.refetch()}>
                Thử lại
              </Button>
            </div>
          )}
          {list.data && (
            <>
              <p className="text-sm">{list.data.totalItems} đầu mối nhận thiệp</p>
              {!list.data.items.length && (
                <p>Chưa có khách phù hợp. Hãy nhập danh sách hoặc đổi từ khóa.</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr>
                      {["Người nhận", "Dự kiến", "Phía", "Nhóm"].map((x) => (
                        <th key={x} className="p-3">
                          {x}
                        </th>
                      ))}
                      {can("INVITATION_SEND") && <th className="p-3">Thiệp cá nhân</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map((g) => (
                      <tr key={g.id} className="border-t">
                        <td className="p-3">
                          <button
                            className="text-left underline underline-offset-4"
                            onClick={() => setSelected(g.id)}
                          >
                            {g.invitationKind === "FAMILY"
                              ? "Gia đình "
                              : g.invitationKind === "GROUP"
                                ? "Nhóm "
                                : ""}
                            {g.honorific ? `${g.honorific} ` : ""}
                            {g.recipientName}
                          </button>
                        </td>
                        <td className="p-3">{g.expectedPeople}</td>
                        <td className="p-3">{sideLabels[g.side]}</td>
                        <td className="p-3">{g.group?.name ?? "Chưa phân nhóm"}</td>
                        {can("INVITATION_SEND") && (
                          <td className="p-3">
                            {g.invitationPath ? (
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={g.invitationPath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="size-4" aria-hidden="true" />
                                    Mở thiệp
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Sao chép link thiệp của ${g.recipientName}`}
                                  title="Sao chép link thiệp"
                                  onClick={() => {
                                    if (g.invitationPath) void copyInvitation(g.invitationPath);
                                  }}
                                >
                                  <Copy className="size-4" aria-hidden="true" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Chưa có link</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Trước
                </Button>
                <span>Trang {page}</span>
                <Button
                  variant="outline"
                  disabled={page * 20 >= list.data.totalItems}
                  onClick={() => setPage(page + 1)}
                >
                  Sau
                </Button>
              </div>
            </>
          )}
          {selected && (
            <section className="space-y-3 rounded-xl border p-5" aria-label="Chi tiết khách mời">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Đóng chi tiết
              </Button>
              {detail.isPending && <p>Đang tải…</p>}
              {detail.isError && (
                <p role="alert">
                  Không tải được chi tiết.{" "}
                  <button onClick={() => void detail.refetch()}>Thử lại</button>
                </p>
              )}
              {detail.data && (
                <>
                  <h2 className="text-xl">{detail.data.recipientName}</h2>
                  <p>
                    {detail.data.phone || "Chưa có SĐT"} · {detail.data.expectedPeople} người dự
                    kiến
                  </p>
                  <p>{detail.data.note}</p>
                  <ol className="list-inside list-decimal space-y-2">
                    {detail.data.places.map((p) => (
                      <li key={p.id}>
                        {p.person
                          ? `${p.person.fullName} · ${p.person.attendanceStatus === "PENDING" ? "Chưa xác nhận" : p.person.attendanceStatus}`
                          : "Chỗ dự kiến chưa có tên"}
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}
