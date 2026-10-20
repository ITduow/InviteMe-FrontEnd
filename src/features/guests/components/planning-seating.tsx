"use client";

import {
  useEffect,
  useCallback,
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
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  closestCenter,
  type KeyboardCoordinateGetter,
  TraversalOrder,
} from "@dnd-kit/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import { ApiError } from "@/core/api/api-error";
import { REALTIME_EVENTS } from "@/core/realtime/realtime-events";
import { usePermission } from "@/shared/components/permission-guard";
import { Button } from "@/shared/ui/button";
import { trapDialogFocus } from "@/shared/lib/dialog-focus";
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
import { SeatingQueue } from "./seating-queue";
import { SeatingTableDrawer } from "./seating-table-drawer";
import { SeatingDragPreview } from "./seating-drag-preview";
import { useSeatingCollaboration } from "../hooks/use-seating-collaboration";
import {
  DraggingLabel,
  SeatingDragPresenceContext,
  useSeatingDragLock,
} from "./seating-drag-presence";
import {
  offsetDragPreview,
  seatingDropFeedback,
  type SeatingDropPosition,
} from "../utils/seating-drag-preview";

// Arrow keys jump between tables rather than moving a few pixels through a long guest list.
const tableCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  const direction = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[
    event.code
  ];
  if (!direction) return;
  const activeRect = context.collisionRect;
  if (!activeRect) return;
  const center = {
    x: activeRect.left + activeRect.width / 2,
    y: activeRect.top + activeRect.height / 2,
  };
  const candidates = context.droppableContainers
    .getEnabled()
    .filter((c) => String(c.id).startsWith("table:") || c.id === "unassigned")
    .flatMap((c) => {
      const rect = context.droppableRects.get(c.id);
      if (!rect) return [];
      const x = rect.left + rect.width / 2,
        y = rect.top + rect.height / 2;
      const dx = x - center.x,
        dy = y - center.y;
      if (dx * (direction[0] ?? 0) + dy * (direction[1] ?? 0) <= 1) return [];
      return [{ x, y, distance: dx * dx + dy * dy }];
    })
    .sort((a, b) => a.distance - b.distance);
  const next = candidates[0];
  if (next)
    return {
      x: currentCoordinates.x + next.x - center.x,
      y: currentCoordinates.y + next.y - center.y,
    };
};

type DropPosition = SeatingDropPosition;
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
  const lock = useSeatingDragLock(ids);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id,
    data: { ids },
    disabled: disabled || !!lock,
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      aria-label={label}
      title={lock ? `${lock.displayName} đang kéo` : undefined}
      onClick={onClick}
      className={className}
      style={{ touchAction: "none", opacity: isDragging || lock ? 0.4 : 1 }}
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
  invalid = false,
  hint,
  highlighted = false,
}: {
  id: string;
  target: DropPosition;
  disabled: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  label?: string;
  invalid?: boolean;
  hint?: string;
  highlighted?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: target, disabled });
  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      title={hint}
      style={style}
      className={`${className ?? ""} ${isOver || highlighted ? (invalid ? "ring-2 ring-red-500" : "ring-2 ring-primary") : ""}`}
    >
      {children}
      {(isOver || highlighted) && hint && (
        <p
          role="status"
          className={`pointer-events-none absolute -top-8 left-0 z-10 whitespace-nowrap rounded-lg border bg-white px-2 py-1 text-xs shadow-sm ${invalid ? "border-red-200 text-red-700" : "border-primary/30 text-foreground"}`}
        >
          {hint}
        </p>
      )}
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
  const detailsRef = useRef<HTMLDialogElement>(null);
  function closeDetails() {
    setTableId(null);
    setPlaceId(null);
    setSeat(null);
  }
  useEffect(() => {
    const dialog = detailsRef.current;
    if (!dialog) return;
    if (tableId || placeId) {
      if (!dialog.open) dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-drawer-heading]")?.focus({ preventScroll: true });
    } else if (dialog.open) {
      dialog.close();
    }
  }, [tableId, placeId]);
  const [dragIds, setDragIds] = useState<string[]>([]);
  const [dragTarget, setDragTarget] = useState<DropPosition | null>(null);
  const [dragEpoch, setDragEpoch] = useState(0);
  const abortDrag = useCallback(() => {
    setDragIds([]);
    setDragTarget(null);
    setDragEpoch((value) => value + 1);
  }, []);
  const collaborationError = useCallback(() => {
    setFailure(true);
    setMessage(
      "Chưa giữ được quyền kéo hoặc kết nối đã mất. Vui lòng thử lại khi đồng bộ kết nối.",
    );
  }, []);
  const collaboration = useSeatingCollaboration(weddingId, abortDrag, collaborationError);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: tableCoordinates }),
  );
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
    if (realtime.getStatus() !== "connected") {
      collaborationError();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFailure(false);
    setMessage("Đang lưu…");
    if (optimistic) setPreview(optimistic);
    try {
      const version = planQuery.data.version;
      const latest =
        input.action === "MOVE_PLACES"
          ? await collaboration.run(input.placeIds, (token) =>
              changeSeatingPlan(api, weddingId, version, input, token),
            )
          : await changeSeatingPlan(api, weddingId, version, input);
      cache.setQueryData<SeatingPlan>(key, (current) =>
        current && current.version > latest.version ? current : latest,
      );
      if (input.action === "MOVE_PLACES") {
        const destination = latest.tables.find((t) => t.id === input.tableId);
        const notice = destination
          ? `Đã xếp ${input.placeIds.length} người vào ${destination.name}`
          : `Đã bỏ xếp ${input.placeIds.length} người`;
        setMessage(notice);
      } else setMessage("Đã lưu");
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
    const lock = collaboration.leases.find(
      (lease) =>
        lease.connectionId !== collaboration.connectionId &&
        ids.some((id) => lease.placeIds.includes(id)),
    );
    if (lock) {
      collaboration.cancel();
      setFailure(true);
      setMessage(
        `${lock.displayName} đang kéo người trong lựa chọn này. Hãy chờ thao tác hoàn tất.`,
      );
      return;
    }
    const next = previewSeatMove(plan, ids, target, seatNumber);
    if (!next) {
      collaboration.cancel();
      setFailure(true);
      const table = plan.tables.find((t) => t.id === target);
      const occupied = plan.assignments.filter(
        (a) => a.tableId === target && !ids.includes(a.placeId),
      ).length;
      const shortage = table ? ids.length - (table.capacity - occupied) : 0;
      setMessage(
        shortage > 0
          ? `${table?.name} thiếu ${shortage} chỗ. Chưa thay đổi vị trí.`
          : "Ghế đã có khách hoặc không còn khả dụng. Chưa thay đổi vị trí.",
      );
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
  const guests = new Map(plan.guests.map((g) => [g.id, g]));
  const inspectedPlace = plan.places.find((p) => p.id === placeId);
  const inspectedGuest = inspectedPlace ? guests.get(inspectedPlace.guestId) : undefined;
  const inspectedTable = plan.tables.find((t) => t.id === tableId);
  const dragFeedback = seatingDropFeedback(plan, dragIds, dragTarget);
  const placeName = (id: string) => {
    const p = plan.places.find((x) => x.id === id),
      g = p ? guests.get(p.guestId) : undefined;
    return (
      p?.person?.fullName ??
      `Chỗ dự kiến ${p?.position ?? ""} · ${g ? recipient(g) : "Chưa có tên"}`
    );
  };
  return (
    <SeatingDragPresenceContext.Provider
      value={collaboration.leases.filter(
        (lease) => lease.connectionId !== collaboration.connectionId,
      )}
    >
      <DndContext
        key={dragEpoch}
        autoScroll={{
          enabled: true,
          order: TraversalOrder.ReversedTreeOrder,
          threshold: { x: 0.15, y: 0.15 },
          acceleration: 8,
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Bấm chọn người hoặc nhóm, rồi bấm bàn để xếp. Trên tay cầm kéo, nhấn Space hoặc Enter để bắt đầu, dùng phím mũi tên chọn bàn, nhấn Space hoặc Enter để thả, Escape để hủy.",
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
          (args.pointerCoordinates
            ? pointerWithin(args)
            : closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                  (c) => String(c.id).startsWith("table:") || c.id === "unassigned",
                ),
              })
          ).sort(
            (a, b) =>
              Number(String(b.id).startsWith("seat:")) - Number(String(a.id).startsWith("seat:")),
          )
        }
        onDragStart={({ active }) => {
          const ids = (active.data.current?.ids as string[] | undefined) ?? [];
          collaboration.begin(ids);
          setDragIds(ids);
          setDragTarget(null);
          setSelection([]);
        }}
        onDragOver={({ over }) => {
          const target = (over?.data.current as DropPosition | undefined) ?? null;
          setDragTarget(target);
          collaboration.hover(target);
        }}
        onDragCancel={() => {
          setDragIds([]);
          setDragTarget(null);
          collaboration.cancel();
        }}
        onDragEnd={({ active, over }) => {
          setDragIds([]);
          setDragTarget(null);
          const ids = active.data.current?.ids as string[] | undefined;
          const target = over?.data.current as DropPosition | undefined;
          if (ids && target) move(ids, target.tableId, target.seatNumber);
          else collaboration.cancel();
        }}
      >
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl">Sắp xếp chỗ ngồi</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Kéo người hoặc nhóm vào bàn. Hoặc bấm chọn khách, rồi bấm bàn để xếp.
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
          <div aria-live="polite" className="flex flex-wrap gap-2">
            {collaboration.leases
              .filter((lease) => lease.connectionId !== collaboration.connectionId)
              .map((lease) => (
                <span
                  key={lease.connectionId}
                  className="inline-flex items-center gap-2 rounded-lg border bg-card px-2 py-1 text-xs"
                >
                  <DraggingLabel presence={lease} />
                  <span>
                    {lease.placeIds.length} người
                    {lease.tableId
                      ? ` → ${plan.tables.find((table) => table.id === lease.tableId)?.name ?? "Bàn"}`
                      : ""}
                  </span>
                </span>
              ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ghế xanh: đã xác nhận tham dự · xám: chưa xác nhận/chưa có tên · viền nét đứt: ghế
            trống.
          </p>
          {message && failure && (
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
          <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <DropTarget
              id="unassigned"
              target={{ tableId: null }}
              disabled={!editable || saving}
              className="space-y-3 rounded-xl border bg-card p-4"
              label="Nhóm khách để xếp chỗ"
            >
              <SeatingQueue
                plan={plan}
                disabled={!editable || saving || status !== "connected"}
                selection={selection}
                onSelect={(ids) => {
                  closeDetails();
                  setSelection(ids);
                }}
                onTable={(id) => {
                  setSelection([]);
                  setTableId(id);
                  setSeat(null);
                  setPlaceId(null);
                  document
                    .getElementById("seating-table-" + id)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              />
              {selection.length > 0 && (
                <div
                  className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs"
                  role="status"
                >
                  <p>Đã chọn {selection.length} người · Bấm bàn để xếp</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving || !editable}
                      onClick={() => move(selection, null)}
                    >
                      Bỏ xếp
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelection([])}>
                      Bỏ chọn
                    </Button>
                  </div>
                </div>
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
                  const remote = collaboration.leases.filter(
                    (lease) =>
                      lease.connectionId !== collaboration.connectionId && lease.tableId === t.id,
                  );
                  const ghostSeats = remote.flatMap((lease) => {
                    const feedback = seatingDropFeedback(plan, lease.placeIds, {
                      tableId: t.id,
                      ...(lease.seatNumber ? { seatNumber: lease.seatNumber } : {}),
                    });
                    return feedback?.valid ? feedback.seats : [];
                  });
                  const moving = dragIds.length ? dragIds : selection;
                  const occupied = members.filter((a) => !moving.includes(a.placeId)).length;
                  const shortage = Math.max(0, moving.length - (t.capacity - occupied));
                  return (
                    <DropTarget
                      key={t.id}
                      id={`table:${t.id}`}
                      target={{ tableId: t.id }}
                      disabled={!editable || saving}
                      className={`relative w-[270px] max-w-full rounded-xl border bg-white/50 p-3 transition-colors ${members.length === t.capacity ? "opacity-60" : ""} ${moving.length ? (shortage ? "border-red-300" : "border-primary/60") : ""}`}
                      highlighted={dragTarget?.tableId === t.id || remote.length > 0}
                      invalid={
                        dragTarget?.tableId === t.id ? dragFeedback?.valid === false : shortage > 0
                      }
                      hint={
                        moving.length
                          ? dragTarget?.tableId === t.id && dragFeedback
                            ? dragFeedback.message
                            : shortage
                              ? `Thiếu ${shortage} chỗ`
                              : `Đủ chỗ cho ${moving.length} người`
                          : undefined
                      }
                      label={`Vùng thả ${t.name}`}
                    >
                      {remote.length > 0 && (
                        <p className="mb-1 truncate text-center text-xs text-muted-foreground">
                          {remote.map((lease) => lease.displayName).join(", ")} đang chọn bàn
                        </p>
                      )}
                      <div
                        id={`seating-table-${t.id}`}
                        className="relative aspect-square scroll-mt-6"
                      >
                        <Image
                          src="/images/seating/round-table.svg"
                          alt=""
                          width={200}
                          height={200}
                          className="pointer-events-none absolute left-[16%] top-[16%] size-[68%]"
                        />
                        <button
                          className={`absolute left-[25%] top-[25%] flex size-1/2 flex-col items-center justify-center rounded-full text-center text-sm ${tableId === t.id ? "ring-2 ring-primary" : ""}`}
                          aria-pressed={tableId === t.id && seat === null}
                          aria-label={`Xem danh sách ${t.name}`}
                          onClick={() => {
                            if (selection.length && editable) {
                              move(selection, t.id);
                              return;
                            }
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
                              invalid={
                                moving.length > 0 &&
                                (shortage > 0 || (!!a && !moving.includes(a.placeId)))
                              }
                              className={`absolute h-10 w-9 rounded-lg ${ghostSeats.includes(n) ? "border-2 border-dashed border-primary bg-primary/10" : ""} ${dragTarget?.tableId === t.id && dragFeedback?.valid && dragFeedback.seats.includes(n) ? "bg-primary/20 ring-2 ring-primary" : ""}`}
                              label={
                                dragTarget?.tableId === t.id &&
                                dragFeedback?.valid &&
                                dragFeedback.seats.includes(n)
                                  ? `Sẽ xếp vào ${t.name}, ghế ${n}`
                                  : undefined
                              }
                              style={{
                                left: `calc(${50 + 43 * Math.cos(angle)}% - 18px)`,
                                top: `calc(${50 + 43 * Math.sin(angle)}% - 20px)`,
                              }}
                            >
                              <DragSource
                                id={`chair:${t.id}:${n}`}
                                ids={p ? [p.id] : []}
                                disabled={!p || !editable || saving || status !== "connected"}
                                label={`${t.name}, ghế ${n}: ${p ? placeName(p.id) : "Trống"}`}
                                onClick={() => {
                                  if (selection.length && editable) {
                                    move(selection, t.id, n);
                                    return;
                                  }
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
                                  style={{
                                    transform: `rotate(${(angle * 180) / Math.PI + 90}deg)`,
                                  }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                                  {n}
                                </span>
                              </DragSource>
                            </DropTarget>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1" aria-label={`Khách tại ${t.name}`}>
                        {members.slice(0, 4).map((a) => {
                          const person = plan.places.find((p) => p.id === a.placeId);
                          const guest = plan.guests.find((g) => g.id === person?.guestId);
                          const name =
                            person?.person?.fullName ||
                            (person?.position === 1
                              ? guest?.recipientName
                              : `Đi kèm ${person?.position}`);
                          return (
                            <button
                              key={a.placeId}
                              className="max-w-full truncate rounded-full bg-primary/10 px-2 py-1 text-[10px] focus-visible:outline-2 focus-visible:outline-primary"
                              onClick={() => {
                                setTableId(t.id);
                                setPlaceId(a.placeId);
                                setSeat(a.seatNumber);
                              }}
                              title={name}
                            >
                              {name}
                            </button>
                          );
                        })}
                        {members.length > 4 && (
                          <span className="px-1 py-1 text-[10px] text-muted-foreground">
                            +{members.length - 4}
                          </span>
                        )}
                      </div>
                    </DropTarget>
                  );
                })}
              </div>
            </section>
            <dialog
              ref={detailsRef}
              onKeyDown={trapDialogFocus}
              onClose={(event) => {
                if (event.target === event.currentTarget) closeDetails();
              }}
              aria-labelledby="seating-details-title"
              className="seating-details-dialog fixed inset-x-0 bottom-0 top-auto m-0 h-[85dvh] max-h-[85dvh] w-full max-w-none overflow-hidden rounded-t-2xl border border-foreground/10 bg-white p-0 text-foreground shadow-2xl backdrop:bg-black/30 open:flex open:flex-col sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:max-w-lg sm:rounded-none"
            >
              {inspectedTable && seat === null && !inspectedPlace ? (
                <SeatingTableDrawer
                  key={inspectedTable.id + ":" + plan.version}
                  table={inspectedTable}
                  plan={plan}
                  editable={editable}
                  saving={saving}
                  onClose={closeDetails}
                  onView={(id, number) => {
                    setPlaceId(id);
                    setSeat(number);
                  }}
                  onMove={(id) => {
                    setSelection([id]);
                    closeDetails();
                  }}
                  onUnassign={(id) => move([id], null)}
                  onAssign={(number) => {
                    if (selection.length) move(selection, inspectedTable.id, number);
                    else {
                      closeDetails();
                      setFailure(false);
                      setMessage(
                        "Chọn khách trong hàng chờ, rồi bấm ghế " +
                          number +
                          " của " +
                          inspectedTable.name +
                          " để xếp.",
                      );
                    }
                  }}
                  onSave={(name, capacity) =>
                    void change({
                      action: "UPDATE_TABLE",
                      tableId: inspectedTable.id,
                      name,
                      capacity,
                    })
                  }
                  onDelete={() =>
                    void change({ action: "DELETE_TABLE", tableId: inspectedTable.id })
                  }
                />
              ) : (
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h2
                      id="seating-details-title"
                      data-drawer-heading
                      tabIndex={-1}
                      className="text-lg font-semibold outline-none"
                    >
                      {seat !== null || inspectedPlace ? "Thông tin người ngồi" : "Thông tin bàn"}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 outline-none hover:bg-foreground/5 focus-visible:ring-1 focus-visible:ring-offset-0"
                      aria-label="Đóng thông tin bàn ghế"
                      onClick={closeDetails}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                  {!inspectedTable && !inspectedPlace && (
                    <p className="text-sm text-muted-foreground">
                      Bấm giữa bàn để xem danh sách; bấm ghế để xem người. Chọn khách trong hàng chờ
                      rồi bấm bàn hoặc ghế để xếp.
                    </p>
                  )}
                  {inspectedTable && (
                    <>
                      <h3 className="text-lg">
                        {inspectedTable.name}
                        {seat ? ` · Ghế ${seat}` : ""}
                      </h3>
                      {seat && !inspectedPlace && <p className="text-sm">Ghế trống</p>}
                      {editable && seat && !inspectedPlace && selection.length > 0 && (
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
                          onClick={() => {
                            setSelection([inspectedPlace.id]);
                            closeDetails();
                          }}
                        >
                          Chọn chỗ này để chuyển
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </dialog>
          </div>
        </section>
        {message && !failure && (
          <div
            role="status"
            className="fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-lg"
          >
            <span>{message}</span>
            {!saving && (
              <button
                aria-label="Ẩn thông báo"
                onClick={() => setMessage("")}
                className="rounded p-1 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <DragOverlay
          modifiers={[offsetDragPreview]}
          style={{ pointerEvents: "none", width: "max-content", maxWidth: "75vw" }}
          adjustScale={false}
        >
          {dragIds.length > 0 && (
            <SeatingDragPreview plan={plan} ids={dragIds} feedback={dragFeedback} />
          )}
        </DragOverlay>
      </DndContext>
    </SeatingDragPresenceContext.Provider>
  );
}
