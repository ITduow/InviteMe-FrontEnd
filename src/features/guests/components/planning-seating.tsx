"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
} from "@dnd-kit/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useRuntime } from "@/core/config/runtime";
import { ApiError } from "@/core/api/api-error";
import { REALTIME_EVENTS } from "@/core/realtime/realtime-events";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import {
  getSeatingPlan,
  changeSeatingPlan,
  seatingKey,
  type SeatingChange,
  type SeatingPlan,
} from "../api/planning-seating.api";
import { sideLabels, type PlanningGuest } from "../api/planning.api";
import { previewSeatMove } from "../utils/planning-seat-move";
import { PlanningSuggestions } from "./planning-suggestions";

type DropPosition = { tableId: string | null; seatNumber?: number };
function DragSource({
  id,
  ids,
  disabled,
  onClick,
  className,
  children,
  label,
}: {
  id: string;
  ids: string[];
  disabled: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id,
    data: { ids },
    disabled,
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      aria-label={label}
      aria-disabled={undefined}
      onClick={onClick}
      className={className}
      style={{ touchAction: "none", opacity: isDragging ? 0.4 : 1 }}
    >
      {children}
    </button>
  );
}
function DropTarget({
  id,
  target,
  disabled,
  className,
  style,
  children,
  label,
}: {
  id: string;
  target: DropPosition;
  disabled: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  label?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: target, disabled });
  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      style={style}
      className={`${className ?? ""} ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      {children}
    </div>
  );
}
function recipient(g: PlanningGuest) {
  const prefix =
    g.invitationKind === "FAMILY" ? "Gia đình " : g.invitationKind === "GROUP" ? "Nhóm " : "";
  return `${prefix}${g.honorific ? `${g.honorific.toLocaleLowerCase("vi")} ` : ""}${g.recipientName}`;
}
const statuses: Record<string, string> = {
  PENDING: "Chưa xác nhận",
  ATTENDING: "Đã xác nhận tham dự",
  DECLINED: "Từ chối",
  WAITLISTED: "Đang chờ",
};

export function PlanningSeating({ weddingId }: { weddingId: string }) {
  const { api, realtime } = useRuntime();
  const { can } = usePermission();
  const editable = can("SEATING_EDIT") && can("SEATING_VIEW");
  const cache = useQueryClient();
  const key = seatingKey(weddingId);
  const planQuery = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getSeatingPlan(api, weddingId, signal),
    enabled: can("SEATING_VIEW"),
    refetchOnWindowFocus: true,
  });
  const [preview, setPreview] = useState<SeatingPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [seat, setSeat] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [onlyUnplaced, setOnlyUnplaced] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const status = useSyncExternalStore(
    realtime.subscribe,
    realtime.getStatus,
    realtime.getServerStatus,
  );
  useEffect(() => {
    const invalidate = () => {
      void cache.invalidateQueries({ queryKey: seatingKey(weddingId) });
    };
    const stopEvent = realtime.on(REALTIME_EVENTS.seating, invalidate);
    const stopResync = realtime.onResync(invalidate);
    return () => {
      stopEvent();
      stopResync();
    };
  }, [realtime, cache, weddingId]);

  const plan = preview ?? planQuery.data;
  async function change(input: SeatingChange, optimistic?: SeatingPlan) {
    if (!editable || savingRef.current || !planQuery.data) return;
    savingRef.current = true;
    setSaving(true);
    setFailure(false);
    setMessage("Đang lưu…");
    if (optimistic) setPreview(optimistic);
    try {
      const latest = await changeSeatingPlan(api, weddingId, planQuery.data.version, input);
      cache.setQueryData<SeatingPlan>(key, (current) =>
        current && current.version > latest.version ? current : latest,
      );
      setMessage("Đã lưu");
      setSelection([]);
      if (input.action === "DELETE_TABLE") {
        setTableId(null);
        setSeat(null);
      }
    } catch (error) {
      setFailure(true);
      setMessage(
        error instanceof ApiError && error.status === 409
          ? "Sơ đồ hoặc danh sách khách vừa thay đổi. Đã hủy thao tác; hãy kiểm tra bản mới và tính lại gợi ý nếu cần."
          : error instanceof ApiError && error.status === 403
            ? "Bạn không có quyền sửa sơ đồ này."
            : "Chưa lưu được: kiểm tra sức chứa, ghế đang có khách hoặc kết nối. Đang tải lại trạng thái đã lưu.",
      );
    } finally {
      setPreview(null);
      savingRef.current = false;
      setSaving(false);
      await cache.invalidateQueries({ queryKey: key });
    }
  }
  function move(ids: string[], target: string | null, seatNumber?: number) {
    if (!plan || !editable || savingRef.current) return;
    const next = previewSeatMove(plan, ids, target, seatNumber);
    if (!next) {
      setFailure(true);
      setMessage("Bàn không đủ chỗ hoặc ghế đã có khách. Chưa thay đổi vị trí.");
      return;
    }
    void change(
      {
        action: "MOVE_PLACES",
        placeIds: ids,
        tableId: target,
        ...(seatNumber ? { seatNumber } : {}),
      },
      next,
    );
  }
  if (planQuery.isPending) return <p role="status">Đang tải sơ đồ…</p>;
  if (planQuery.isError || !plan)
    return (
      <div role="alert">
        Không tải được sơ đồ. <Button onClick={() => void planQuery.refetch()}>Thử lại</Button>
      </div>
    );
  const assigned = new Map(plan.assignments.map((a) => [a.placeId, a]));
  const guests = new Map(plan.guests.map((g) => [g.id, g]));
  const inspectedPlace = plan.places.find((p) => p.id === placeId);
  const inspectedGuest = inspectedPlace ? guests.get(inspectedPlace.guestId) : undefined;
  const inspectedTable = plan.tables.find((t) => t.id === tableId);
  const tableMembers = tableId
    ? plan.assignments
        .filter((a) => a.tableId === tableId)
        .sort((a, b) => a.seatNumber - b.seatNumber)
    : [];
  const placeName = (id: string) => {
    const p = plan.places.find((x) => x.id === id),
      g = p ? guests.get(p.guestId) : undefined;
    return (
      p?.person?.fullName ??
      `Chỗ dự kiến ${p?.position ?? ""} · ${g ? recipient(g) : "Chưa có tên"}`
    );
  };
  return (
    <DndContext
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Bấm chọn nhóm hoặc chỗ, rồi dùng nút Đặt lựa chọn vào bàn hoặc ghế. Có thể dùng chuột kéo thả.",
        },
        announcements: {
          onDragStart: () => "Đang kéo chỗ dự kiến.",
          onDragOver: () => "Thả vào bàn hoặc ghế để lưu.",
          onDragEnd: () => "Đã thả. Hệ thống kiểm tra và lưu vị trí.",
          onDragCancel: () => "Đã hủy kéo.",
        },
      }}
      sensors={sensors}
      collisionDetection={(args) =>
        pointerWithin(args).sort(
          (a, b) =>
            Number(String(b.id).startsWith("seat:")) - Number(String(a.id).startsWith("seat:")),
        )
      }
      onDragStart={({ active }) =>
        setDragCount((active.data.current?.ids as string[] | undefined)?.length ?? 0)
      }
      onDragCancel={() => setDragCount(0)}
      onDragEnd={({ active, collisions }) => {
        setDragCount(0);
        const ids = active.data.current?.ids as string[] | undefined;
        const target = collisions?.[0]?.data?.droppableContainer?.data.current as
          DropPosition | undefined;
        if (ids && target) move(ids, target.tableId, target.seatNumber);
      }}
    >
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">Sắp xếp chỗ ngồi</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Thả vào bàn hoặc ghế để tự lưu. Kéo cả nhóm đi cùng hoặc riêng từng chỗ.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/weddings/${weddingId}/guests`}>Danh sách khách</Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>
            {plan.assignments.length}/{plan.places.length} chỗ đã xếp
          </span>
          <span>{plan.tables.length} bàn</span>
          <span>
            {status === "connected"
              ? "Đồng bộ trực tiếp đã kết nối"
              : "Đang nối lại đồng bộ trực tiếp"}
          </span>
          <span>Phiên bản {plan.version}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ghế xanh: đã xác nhận tham dự · xám: chưa xác nhận/chưa có tên · viền nét đứt: ghế trống.
        </p>
        {message && (
          <p
            role={failure ? "alert" : "status"}
            className={`rounded-lg border p-3 text-sm ${failure ? "border-red-300 text-red-800" : "text-emerald-800"}`}
          >
            {message}
          </p>
        )}
        <PlanningSuggestions plan={plan} editable={editable} saving={saving} onChange={change} />
        {editable && (
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Hoặc thêm lẻ một bàn với tên riêng
            </summary>
            <form
              className="flex flex-wrap items-end gap-3 rounded-xl border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void change({
                  action: "CREATE_TABLE",
                  name: String(data.get("name")),
                  capacity: Number(data.get("capacity")),
                });
              }}
            >
              <label className="text-sm">
                Tên bàn
                <input
                  name="name"
                  aria-label="Tên bàn mới"
                  required
                  maxLength={100}
                  placeholder={`Bàn ${plan.tables.length + 1}`}
                  className="mt-1 block rounded border p-2"
                />
              </label>
              <label className="text-sm">
                Số ghế
                <input
                  name="capacity"
                  aria-label="Số ghế bàn mới"
                  type="number"
                  min={1}
                  max={20}
                  required
                  defaultValue={10}
                  className="mt-1 block w-24 rounded border p-2"
                />
              </label>
              <Button disabled={saving}>Thêm bàn</Button>
            </form>
          </details>
        )}
        <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_280px]">
          <DropTarget
            id="unassigned"
            target={{ tableId: null }}
            disabled={!editable || saving}
            className="space-y-3 rounded-xl border bg-card p-4"
            label="Nhóm khách để xếp chỗ"
          >
            <h2 className="text-lg font-medium">Nhóm đi cùng</h2>
            <input
              aria-label="Tìm nhóm hoặc người nhận"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, nhóm, phía…"
              className="w-full rounded border p-2 text-sm"
            />
            <label className="flex gap-2 text-xs">
              <input
                type="checkbox"
                checked={onlyUnplaced}
                onChange={(e) => setOnlyUnplaced(e.target.checked)}
              />
              Chỉ nhóm còn chỗ chưa xếp
            </label>
            {selection.length > 0 && (
              <div className="space-y-2 rounded-lg bg-muted p-3 text-xs">
                <p>Đang chọn {selection.length} chỗ</p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving || !editable}
                  onClick={() => move(selection, null)}
                >
                  Bỏ xếp lựa chọn
                </Button>
                <button className="block underline" onClick={() => setSelection([])}>
                  Bỏ chọn
                </button>
              </div>
            )}
            <div className="max-h-[260px] lg:max-h-[620px] space-y-3 overflow-y-auto">
              {plan.guests
                .filter((g) => {
                  const places = plan.places.filter((p) => p.guestId === g.id);
                  return (
                    `${g.recipientName} ${g.group?.name ?? ""} ${sideLabels[g.side]}`
                      .toLocaleLowerCase("vi")
                      .includes(search.toLocaleLowerCase("vi")) &&
                    (!onlyUnplaced || places.some((p) => !assigned.has(p.id)))
                  );
                })
                .map((g) => {
                  const places = plan.places.filter((p) => p.guestId === g.id),
                    ids = places.map((p) => p.id);
                  return (
                    <article key={g.id} className="space-y-2 rounded-lg border p-3">
                      <DragSource
                        id={`group:${g.id}`}
                        ids={ids}
                        disabled={!editable || saving}
                        className="text-left text-sm font-medium underline underline-offset-4"
                        onClick={() => {
                          setSelection(ids);
                          setPlaceId(null);
                        }}
                      >
                        Chọn nhóm: {recipient(g)}
                      </DragSource>
                      <p className="text-xs text-muted-foreground">
                        {sideLabels[g.side]} · {g.group?.name ?? "Chưa phân nhóm"} ·{" "}
                        {places.filter((p) => assigned.has(p.id)).length}/{places.length} đã xếp
                      </p>
                      <details>
                        <summary className="cursor-pointer text-xs">
                          Từng người / chỗ dự kiến
                        </summary>
                        <div className="mt-2 space-y-2">
                          {places.map((p) => (
                            <DragSource
                              key={p.id}
                              id={`list:${p.id}`}
                              ids={[p.id]}
                              disabled={!editable || saving}
                              onClick={() => {
                                setPlaceId(p.id);
                                setSelection(editable ? [p.id] : []);
                              }}
                              className="block w-full rounded border p-2 text-left text-xs"
                            >
                              {placeName(p.id)} · {assigned.has(p.id) ? "Đã xếp" : "Chưa xếp"}
                            </DragSource>
                          ))}
                        </div>
                      </details>
                    </article>
                  );
                })}
            </div>
            {!plan.guests.length && (
              <p className="text-sm">Chưa có khách. Nhập danh sách trước khi xếp bàn.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Thả chỗ vào vùng danh sách này để bỏ xếp.
            </p>
          </DropTarget>
          <section
            className="min-w-0 rounded-xl border bg-[#F8F5EF] p-4"
            aria-label="Sơ đồ bàn đã lưu"
          >
            {!plan.tables.length && (
              <p className="p-5 text-center text-sm">Thêm bàn đầu tiên để bắt đầu.</p>
            )}
            <div className="flex flex-wrap justify-center gap-5">
              {plan.tables.map((t) => {
                const members = plan.assignments.filter((a) => a.tableId === t.id);
                return (
                  <DropTarget
                    key={t.id}
                    id={`table:${t.id}`}
                    target={{ tableId: t.id }}
                    disabled={!editable || saving}
                    className="w-[270px] max-w-full rounded-xl border bg-white/50 p-3"
                    label={`Vùng thả ${t.name}`}
                  >
                    <div className="relative aspect-square">
                      <Image
                        src="/images/seating/round-table.svg"
                        alt=""
                        width={200}
                        height={200}
                        className="pointer-events-none absolute left-[16%] top-[16%] size-[68%]"
                      />
                      <button
                        className="absolute left-[25%] top-[25%] flex size-1/2 flex-col items-center justify-center rounded-full text-center text-sm"
                        aria-label={`Xem danh sách ${t.name}`}
                        onClick={() => {
                          setTableId(t.id);
                          setPlaceId(null);
                          setSeat(null);
                        }}
                      >
                        <strong>{t.name}</strong>
                        <span>
                          {members.length}/{t.capacity} chỗ
                        </span>
                      </button>
                      {Array.from({ length: t.capacity }, (_, i) => {
                        const n = i + 1,
                          angle = (i / t.capacity) * Math.PI * 2 - Math.PI / 2;
                        const a = members.find((x) => x.seatNumber === n),
                          p = plan.places.find((x) => x.id === a?.placeId);
                        const confirmed = p?.person?.attendanceStatus === "ATTENDING";
                        return (
                          <DropTarget
                            key={n}
                            id={`seat:${t.id}:${n}`}
                            target={{ tableId: t.id, seatNumber: n }}
                            disabled={!editable || saving}
                            className="absolute h-10 w-9"
                            style={{
                              left: `calc(${50 + 43 * Math.cos(angle)}% - 18px)`,
                              top: `calc(${50 + 43 * Math.sin(angle)}% - 20px)`,
                            }}
                          >
                            <DragSource
                              id={`chair:${t.id}:${n}`}
                              ids={p ? [p.id] : []}
                              disabled={!p || !editable || saving}
                              label={`${t.name}, ghế ${n}: ${p ? placeName(p.id) : "Trống"}`}
                              onClick={() => {
                                setTableId(t.id);
                                setSeat(n);
                                setPlaceId(p?.id ?? null);
                              }}
                              className="relative size-full rounded focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              <Image
                                src={`/images/seating/${!p ? "chair-empty.svg" : confirmed ? "chair-confirmed.svg" : "chair-pending.svg"}`}
                                alt=""
                                width={36}
                                height={40}
                                draggable={false}
                                className="pointer-events-none size-full"
                                style={{ transform: `rotate(${(angle * 180) / Math.PI + 90}deg)` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                                {n}
                              </span>
                            </DragSource>
                          </DropTarget>
                        );
                      })}
                    </div>
                    {editable && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={saving || !selection.length}
                        onClick={() => move(selection, t.id)}
                      >
                        Đặt lựa chọn vào {t.name}
                      </Button>
                    )}
                  </DropTarget>
                );
              })}
            </div>
          </section>
          <aside
            className="space-y-3 rounded-xl border bg-card p-4 lg:col-span-2 2xl:col-span-1"
            aria-label="Thông tin bàn và ghế"
          >
            <h2 className="font-medium">Thông tin bàn / ghế</h2>
            {!inspectedTable && !inspectedPlace && (
              <p className="text-sm text-muted-foreground">
                Bấm giữa bàn để xem danh sách; bấm ghế để xem người. Có thể chọn nhóm/chỗ rồi bấm
                “Đặt lựa chọn” thay cho kéo thả.
              </p>
            )}
            {inspectedTable && (
              <>
                <h3 className="text-lg">
                  {inspectedTable.name}
                  {seat ? ` · Ghế ${seat}` : ""}
                </h3>
                {seat && !inspectedPlace && <p className="text-sm">Ghế trống</p>}
                {editable && seat && (
                  <Button
                    variant="outline"
                    disabled={saving || !selection.length}
                    onClick={() => move(selection, inspectedTable.id, seat)}
                  >
                    Đặt lựa chọn vào ghế này
                  </Button>
                )}
              </>
            )}
            {inspectedPlace && inspectedGuest && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{placeName(inspectedPlace.id)}</p>
                <p>
                  {statuses[inspectedPlace.person?.attendanceStatus ?? "PENDING"] ??
                    "Chưa xác định"}
                </p>
                <p>Thuộc thiệp: {recipient(inspectedGuest)}</p>
                <p>
                  {sideLabels[inspectedGuest.side]} ·{" "}
                  {inspectedGuest.group?.name ?? "Chưa phân nhóm"}
                </p>
                <p>Liên hệ đại diện: {inspectedGuest.phone ?? "Chưa có SĐT"}</p>
                <p>{inspectedGuest.note}</p>
                {editable && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setSelection([inspectedPlace.id])}
                  >
                    Chọn chỗ này để chuyển
                  </Button>
                )}
              </div>
            )}
            {inspectedTable && (
              <>
                <p className="text-xs">
                  {tableMembers.length}/{inspectedTable.capacity} chỗ đã xếp
                </p>
                <ol className="space-y-2">
                  {tableMembers.map((a) => (
                    <li key={a.placeId}>
                      <button
                        className="text-left text-xs underline"
                        onClick={() => {
                          setPlaceId(a.placeId);
                          setSeat(a.seatNumber);
                        }}
                      >
                        Ghế {a.seatNumber}: {placeName(a.placeId)}
                      </button>
                    </li>
                  ))}
                </ol>
                {editable && (
                  <form
                    key={`${inspectedTable.id}:${plan.version}`}
                    className="space-y-2 border-t pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      void change({
                        action: "UPDATE_TABLE",
                        tableId: inspectedTable.id,
                        name: String(data.get("name")),
                        capacity: Number(data.get("capacity")),
                      });
                    }}
                  >
                    <label className="block text-xs">
                      Tên bàn
                      <input
                        className="mt-1 w-full rounded border p-2"
                        name="name"
                        aria-label="Sửa tên bàn"
                        defaultValue={inspectedTable.name}
                        required
                        maxLength={100}
                      />
                    </label>
                    <label className="block text-xs">
                      Số ghế
                      <input
                        className="mt-1 w-full rounded border p-2"
                        name="capacity"
                        aria-label="Sửa số ghế"
                        type="number"
                        min={1}
                        max={20}
                        required
                        defaultValue={inspectedTable.capacity}
                      />
                    </label>
                    <Button size="sm" disabled={saving}>
                      Cập nhật bàn
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      disabled={saving || tableMembers.length > 0}
                      onClick={() =>
                        void change({ action: "DELETE_TABLE", tableId: inspectedTable.id })
                      }
                    >
                      Xóa bàn trống
                    </Button>
                  </form>
                )}
              </>
            )}
          </aside>
        </div>
      </section>
      <DragOverlay>
        {dragCount > 0 && (
          <div className="rounded-lg border bg-white px-4 py-2 text-sm shadow-lg">
            Đang chuyển {dragCount} chỗ
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
