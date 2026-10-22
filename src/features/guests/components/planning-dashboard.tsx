"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/core/api/api-error";
import { useRuntime } from "@/core/config/runtime";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/feedback/confirm-dialog";
import { CoupleImport } from "./couple-import";
import {
  archivePlanningGuest,
  createPlanningGuest,
  restorePlanningGuest,
  importBody,
  importGuests,
  listPlanningGuests,
  getPlanningGuest,
  listPlanningGroups,
  updatePlanningGuest,
  sideLabels,
  type PlanningGuestCreate,
  type PlanningGuestUpdate,
} from "../api/planning.api";
import type { CoupleRow } from "../utils/couple-import";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { PlanningGuestEditForm } from "./planning-guest-edit-form";
import { PlanningGuestCreateForm } from "./planning-guest-create-form";

export function PlanningDashboard({ weddingId }: { weddingId: string }) {
  const { api } = useRuntime();
  const { can } = usePermission();
  const cache = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [side, setSide] = useState("");
  const [groupId, setGroupId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [editingGuest, setEditingGuest] = useState(false);
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
  const createAttempt = useRef<{ serialized: string; key: string } | null>(null);
  const list = useQuery({
    queryKey: ["guest-planning", weddingId, page, search, archivedOnly, side, groupId],
    queryFn: ({ signal }) =>
      listPlanningGuests(api, weddingId, page, search, signal, archivedOnly, { side, groupId }),
    enabled: can("GUEST_VIEW") && !importing,
  });
  const detail = useQuery({
    queryKey: ["guest-planning-detail", weddingId, selected, archivedOnly],
    queryFn: ({ signal }) => getPlanningGuest(api, weddingId, selected ?? "", signal, archivedOnly),
    enabled: !!selected && can("GUEST_VIEW"),
  });
  const groups = useQuery({
    queryKey: ["guest-planning-groups", weddingId],
    queryFn: ({ signal }) => listPlanningGroups(api, weddingId, signal),
    enabled: can("GUEST_VIEW"),
  });
  const createGuest = useMutation({
    mutationFn: ({ input, key }: { input: PlanningGuestCreate; key: string }) =>
      createPlanningGuest(api, weddingId, input, key),
    onSuccess: async (guest) => {
      createAttempt.current = null;
      setCreatingGuest(false);
      setSelected(guest.id);
      setEditingGuest(false);
      setNotice(
        guest.possibleDuplicate
          ? "Đã tạo khách và sinh link thiệp riêng. Lưu ý: có khách đang hoạt động trùng tên hoặc số điện thoại; hãy kiểm tra lại danh sách."
          : "Đã tạo khách, tạo chỗ dự kiến và sinh link thiệp riêng.",
      );
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["guest-planning", weddingId] }),
        cache.invalidateQueries({ queryKey: ["guest-planning-detail", weddingId] }),
        cache.invalidateQueries({ queryKey: ["guest-planning-groups", weddingId] }),
      ]);
    },
    onError: (error) => {
      setNotice(
        error instanceof ApiError &&
          error.status === 400 &&
          Object.keys(error.fieldErrors).some((field) => field.toLowerCase() === "groupid")
          ? "Hãy chọn nhóm khách thuộc phạm vi được giao."
          : error instanceof ApiError && error.status === 403
            ? "Bạn không có quyền tạo khách trong wedding này."
            : error instanceof ApiError && error.status === 404
              ? "Nhóm khách không còn trong phạm vi được giao. Hãy tải lại nhóm rồi thử lại."
              : error instanceof ApiError && error.status === 409
                ? "Yêu cầu tạo khách bị xung đột. Hãy thử lại; hệ thống sẽ tránh tạo trùng khi gửi lại cùng yêu cầu."
                : error instanceof ApiError && error.code === "network"
                  ? "Mất kết nối. Khách chưa được xác nhận đã tạo; có thể gửi lại an toàn."
                  : "Chưa tạo được khách. Hãy kiểm tra lại thông tin.",
      );
    },
  });
  const updateGuest = useMutation({
    mutationFn: ({ guestId, input }: { guestId: string; input: PlanningGuestUpdate }) =>
      updatePlanningGuest(api, weddingId, guestId, input),
    onSuccess: async () => {
      setEditingGuest(false);
      setNotice("Đã cập nhật thông tin khách.");
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["guest-planning", weddingId] }),
        cache.invalidateQueries({ queryKey: ["guest-planning-detail", weddingId, selected] }),
      ]);
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setNotice(
          "Thông tin khách đã được thay đổi ở nơi khác. Đã tải phiên bản mới nhất; hãy kiểm tra và lưu lại.",
        );
        await Promise.all([
          cache.invalidateQueries({ queryKey: ["guest-planning-detail", weddingId, selected] }),
          cache.invalidateQueries({ queryKey: ["guest-planning", weddingId] }),
        ]);
        return;
      }
      setNotice(
        error instanceof ApiError && error.status === 403
          ? "Bạn không có quyền sửa khách này hoặc chuyển khách vào nhóm ngoài phạm vi được giao."
          : error instanceof ApiError && error.code === "network"
            ? "Không thể kết nối máy chủ. Thông tin chưa được lưu."
            : "Chưa thể cập nhật khách. Hãy kiểm tra dữ liệu rồi thử lại.",
      );
    },
  });
  const archiveGuest = useMutation({
    mutationFn: ({ guestId, expectedVersion }: { guestId: string; expectedVersion: number }) =>
      archivePlanningGuest(api, weddingId, guestId, expectedVersion),
    onSuccess: async () => {
      setSelected(null);
      setEditingGuest(false);
      setNotice(
        "Đã lưu trữ khách, thu hồi link thiệp và gỡ phân công bàn. Có thể xem hoặc khôi phục ở mục Đã lưu trữ.",
      );
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["guest-planning", weddingId] }),
        cache.invalidateQueries({ queryKey: ["guest-planning-detail", weddingId] }),
      ]);
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setNotice(
          "Khách vừa được cập nhật ở nơi khác. Đã tải bản mới nhất; hãy mở lại rồi thử lưu trữ.",
        );
        await cache.invalidateQueries({ queryKey: ["guest-planning-detail", weddingId, selected] });
        return;
      }
      setNotice(
        error instanceof ApiError && error.status === 403
          ? "Bạn không có quyền lưu trữ khách này."
          : error instanceof ApiError && error.backendCode === "GUEST_ALREADY_CHECKED_IN"
            ? "Khách đã check-in nên chưa thể lưu trữ. Hãy xử lý check-in trước."
            : error instanceof ApiError && error.status === 404
              ? "Khách không còn trong phạm vi được giao hoặc đã được lưu trữ."
              : "Chưa lưu trữ được khách. Hãy tải lại chi tiết và thử lại.",
      );
    },
  });
  const restoreGuest = useMutation({
    mutationFn: ({ guestId, expectedVersion }: { guestId: string; expectedVersion: number }) =>
      restorePlanningGuest(api, weddingId, guestId, expectedVersion),
    onSuccess: async (guest) => {
      setArchivedOnly(false);
      setSelected(guest.id);
      setEditingGuest(false);
      setPage(1);
      setNotice(
        "Đã khôi phục khách. Link thiệp cũ đã bị thu hồi; link mới đã được tạo. Hãy xếp lại chỗ ngồi nếu cần.",
      );
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["guest-planning", weddingId] }),
        cache.invalidateQueries({ queryKey: ["guest-planning-detail", weddingId] }),
      ]);
    },
    onError: async (error) => {
      setNotice(
        error instanceof ApiError && error.status === 409
          ? "Khách đã thay đổi ở nơi khác. Danh sách đã được tải lại; hãy mở lại khách rồi thử khôi phục."
          : error instanceof ApiError && error.status === 403
            ? "Bạn không có quyền khôi phục khách này."
            : "Chưa khôi phục được khách. Hãy tải lại danh sách đã lưu trữ rồi thử lại.",
      );
      await cache.invalidateQueries({ queryKey: ["guest-planning", weddingId] });
    },
  });
  function saveManualGuest(input: PlanningGuestCreate) {
    const serialized = JSON.stringify(input);
    if (createAttempt.current?.serialized !== serialized)
      createAttempt.current = { serialized, key: crypto.randomUUID() };
    createGuest.mutate({ input, key: createAttempt.current.key });
  }
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
        {can("GUEST_EDIT") && !archivedOnly && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                createAttempt.current = null;
                setNotice("");
                setCreatingGuest((value) => !value);
              }}
            >
              {creatingGuest ? "Đóng form" : "Thêm khách"}
            </Button>
            <Button
              onClick={() => {
                attempt.current = null;
                setImporting(true);
              }}
            >
              Nhập Excel / CSV
            </Button>
          </div>
        )}
      </div>
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          {notice}
        </p>
      )}
      {creatingGuest && can("GUEST_EDIT") && (
        <div className="space-y-3">
          {groups.isPending ? (
            <p role="status">Đang tải nhóm khách…</p>
          ) : groups.isError ? (
            <p role="alert">Không tải được nhóm khách trong phạm vi được cấp.</p>
          ) : !groups.data?.isWeddingWide && groups.data?.items.length === 0 ? (
            <p role="alert">
              Bạn chưa được giao nhóm khách nào. Hãy nhờ Chủ tiệc cấp nhóm trước khi tạo khách.
            </p>
          ) : (
            <PlanningGuestCreateForm
              groups={groups.data.items}
              isWeddingWide={groups.data.isWeddingWide}
              busy={createGuest.isPending}
              onCancel={() => {
                setCreatingGuest(false);
                createAttempt.current = null;
              }}
              onSave={saveManualGuest}
            />
          )}
        </div>
      )}
      {!can("GUEST_VIEW") ? (
        <p>Bạn không có quyền xem danh sách khách.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái khách">
            <Button
              type="button"
              variant={!archivedOnly ? "default" : "outline"}
              aria-pressed={!archivedOnly}
              onClick={() => {
                setArchivedOnly(false);
                setSelected(null);
                setEditingGuest(false);
                setPage(1);
              }}
            >
              Đang hoạt động
            </Button>
            <Button
              type="button"
              variant={archivedOnly ? "default" : "outline"}
              aria-pressed={archivedOnly}
              onClick={() => {
                setArchivedOnly(true);
                setSelected(null);
                setEditingGuest(false);
                setPage(1);
              }}
            >
              Đã lưu trữ
            </Button>
          </div>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Phía khách
              <select
                className="h-10 rounded-lg border bg-background px-3"
                value={side}
                onChange={(event) => {
                  setSide(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả hai bên</option>
                {Object.entries(sideLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Nhóm khách
              <select
                className="h-10 rounded-lg border bg-background px-3"
                value={groupId}
                onChange={(event) => {
                  setGroupId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả nhóm</option>
                {(groups.data?.items ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {groups.isError && (
            <p role="alert" className="text-sm text-destructive">
              Không tải được nhóm khách; bộ lọc nhóm chưa khả dụng.
            </p>
          )}
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
              <p className="text-sm">
                {list.data.totalItems} {archivedOnly ? "khách đã lưu trữ" : "đầu mối nhận thiệp"}
              </p>
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
                            onClick={() => {
                              setEditingGuest(false);
                              setSelected(g.id);
                            }}
                          >
                            {g.invitationKind === "FAMILY"
                              ? "Gia đình "
                              : g.invitationKind === "GROUP"
                                ? "Nhóm "
                                : ""}
                            {g.honorific ? `${g.honorific} ` : ""}
                            {g.recipientName}
                          </button>
                          {g.archivedAt && (
                            <span className="ml-2 text-xs text-muted-foreground">Đã lưu trữ</span>
                          )}
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
                  {can("GUEST_EDIT") && !editingGuest && !detail.data.archivedAt && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setEditingGuest(true)}>
                        Sửa thông tin
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="destructive" disabled={archiveGuest.isPending}>
                            Lưu trữ khách
                          </Button>
                        }
                        title="Lưu trữ khách này?"
                        description="Khách sẽ rời danh sách đang hoạt động và link thiệp bị thu hồi. Lịch sử RSVP được giữ lại, phân công bàn hiện tại sẽ bị gỡ. Khách đã check-in không thể lưu trữ."
                        cancelLabel="Hủy"
                        confirmLabel={archiveGuest.isPending ? "Đang lưu trữ…" : "Lưu trữ khách"}
                        onConfirm={() =>
                          archiveGuest.mutate({
                            guestId: detail.data.id,
                            expectedVersion: detail.data.version,
                          })
                        }
                      />
                    </div>
                  )}
                  {can("GUEST_EDIT") && detail.data.archivedAt && !editingGuest && (
                    <ConfirmDialog
                      trigger={<Button disabled={restoreGuest.isPending}>Khôi phục khách</Button>}
                      title="Khôi phục khách này?"
                      description="Khách sẽ trở lại danh sách hoạt động và được cấp link thiệp mới. Link cũ vẫn bị thu hồi; bạn cần xếp lại chỗ ngồi nếu cần."
                      cancelLabel="Hủy"
                      confirmLabel={restoreGuest.isPending ? "Đang khôi phục…" : "Khôi phục khách"}
                      onConfirm={() =>
                        restoreGuest.mutate({
                          guestId: detail.data.id,
                          expectedVersion: detail.data.version,
                        })
                      }
                    />
                  )}
                  {editingGuest && can("GUEST_EDIT") ? (
                    groups.isPending ? (
                      <p role="status">Đang tải nhóm khách…</p>
                    ) : groups.isError ? (
                      <p role="alert">
                        Không tải được nhóm trong phạm vi của bạn. Hãy thử đóng rồi mở lại chi tiết.
                      </p>
                    ) : (
                      <PlanningGuestEditForm
                        key={`${detail.data.id}-${detail.data.version}`}
                        guest={detail.data}
                        groups={[
                          ...(detail.data.group &&
                          !groups.data.items.some((group) => group.id === detail.data.group?.id)
                            ? [{ id: detail.data.group.id, name: detail.data.group.name }]
                            : []),
                          ...groups.data.items,
                        ]}
                        busy={updateGuest.isPending}
                        onCancel={() => setEditingGuest(false)}
                        onSave={(input) => updateGuest.mutate({ guestId: detail.data.id, input })}
                      />
                    )
                  ) : (
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
                </>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}
