"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, GripVertical, Plus, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { sideLabels, type PlanningGuest } from "../api/planning.api";
import type { SeatingPlan } from "../api/planning-seating.api";
import { DraggingLabel, useSeatingDragLock } from "./seating-drag-presence";

type Place = SeatingPlan["places"][number];
type Table = SeatingPlan["tables"][number];
type QueueEntry = { guest: PlanningGuest; places: Place[] };
type QueueProps = {
  plan: SeatingPlan;
  disabled: boolean;
  selection: string[];
  onSelect: (ids: string[]) => void;
  onTable: (id: string) => void;
};

export function queuePlaceName(place: Place, guest: PlanningGuest) {
  return (
    place.person?.fullName ||
    (place.position === 1 ? guest.recipientName : `Người đi kèm ${place.position}`)
  );
}

function QueueDrag({
  id,
  ids,
  disabled,
  selected,
  label,
  onSelect,
  children,
}: {
  id: string;
  ids: string[];
  disabled: boolean;
  selected: boolean;
  label: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  const lock = useSeatingDragLock(ids);
  const unavailable = disabled || !!lock;
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useDraggable({
    id,
    data: { ids },
    disabled: unavailable,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1 rounded-lg transition-colors",
        selected && "bg-primary/10",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={unavailable}
        aria-label={`Kéo ${label}`}
        className="shrink-0 touch-none rounded p-1 text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-30"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        disabled={unavailable}
        aria-pressed={selected}
        aria-label={`Chọn ${label}`}
        onPointerDown={(event) => listeners?.onPointerDown?.(event)}
        className={cn(
          "flex min-w-0 flex-1 touch-pan-y items-center gap-2 rounded-lg py-2 pr-2 text-left focus-visible:outline-2 focus-visible:outline-primary",
          (isDragging || lock) && "opacity-40",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">{children}</span>
        </span>
      </button>
      {lock && (
        <span className="w-full pl-6 pb-1">
          <DraggingLabel presence={lock} />
        </span>
      )}
    </div>
  );
}

function TableChip({ table, onTable }: { table?: Table; onTable: QueueProps["onTable"] }) {
  if (!table) return null;
  return (
    <button
      type="button"
      onClick={() => onTable(table.id)}
      aria-label={`Tới ${table.name}`}
      className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {table.name}
    </button>
  );
}

function GuestRow({
  place,
  guest,
  table,
  disabled,
  selected,
  onSelect,
  onTable,
  individual = false,
}: {
  place: Place;
  guest: PlanningGuest;
  table?: Table;
  disabled: boolean;
  selected: boolean;
  onSelect: () => void;
  onTable: QueueProps["onTable"];
  individual?: boolean;
}) {
  const name = queuePlaceName(place, guest);
  const placeholder = !place.person && place.position > 1;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-xl border bg-white p-1",
        placeholder && "border-dashed",
        table && !selected && "bg-muted/30 text-muted-foreground",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <QueueDrag
          id={`queue:${place.id}`}
          ids={[place.id]}
          disabled={disabled}
          selected={selected}
          label={name}
          onSelect={onSelect}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-foreground",
              placeholder && "border border-dashed bg-transparent",
            )}
            aria-hidden="true"
          >
            {placeholder ? (
              <Plus className="size-3" />
            ) : (
              name.trim().split(/\s+/).at(-1)?.slice(0, 1)
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium" title={name}>
              {name}
            </span>
            {individual && (
              <span className="block truncate text-[11px] text-muted-foreground">
                {guest.group?.name ?? sideLabels[guest.side]}
              </span>
            )}
          </span>
        </QueueDrag>
      </div>
      <TableChip table={table} onTable={onTable} />
    </div>
  );
}

function GroupCard({
  entry,
  tablesByPlace,
  disabled,
  selection,
  onSelect,
  onTable,
}: {
  entry: QueueEntry;
  tablesByPlace: Map<string, Table>;
  disabled: boolean;
  selection: string[];
  onSelect: QueueProps["onSelect"];
  onTable: QueueProps["onTable"];
}) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  const { guest, places } = entry;
  const ids = places.map((p) => p.id);
  const selected = ids.length > 0 && ids.every((id) => selection.includes(id));
  const assignedCount = places.filter((p) => tablesByPlace.has(p.id)).length;
  const tableCount = new Set(places.flatMap((p) => tablesByPlace.get(p.id)?.id ?? [])).size;
  const name = `${guest.invitationKind === "FAMILY" ? "Gia đình" : "Nhóm"} ${guest.honorific ? guest.honorific.toLocaleLowerCase("vi") + " " : ""}${guest.recipientName}`;
  return (
    <article
      className={cn(
        "min-w-0 rounded-xl border bg-white p-2",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <QueueDrag
            id={`queue-group:${guest.id}`}
            ids={ids}
            disabled={disabled}
            selected={selected}
            label={name}
            onSelect={() => onSelect(ids)}
          >
            <span className="min-w-0 flex-1 truncate text-xs font-semibold" title={name}>
              {name}
            </span>
          </QueueDrag>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailId}
          aria-label={`${expanded ? "Thu gọn" : "Mở"} ${name}`}
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded p-1 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </div>
      <div className="flex flex-wrap gap-1 px-1 text-[10px] text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5">{sideLabels[guest.side]}</span>
        {guest.group && (
          <span className="rounded-full bg-muted px-2 py-0.5">{guest.group.name}</span>
        )}
        {tableCount > 1 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
            Tách {tableCount} bàn
          </span>
        )}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex w-full items-center gap-2 rounded px-1 text-left text-[11px] text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span>
          {places.length} người · {assignedCount}/{places.length} đã xếp
        </span>
        <span className="ml-auto h-1 w-10 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${places.length ? (assignedCount / places.length) * 100 : 0}%` }}
          />
        </span>
      </button>
      <div id={detailId} hidden={!expanded} className="mt-3 space-y-2 border-t pt-2">
        {places.map((place) => (
          <GuestRow
            key={place.id}
            place={place}
            guest={guest}
            table={tablesByPlace.get(place.id)}
            disabled={disabled}
            selected={selection.includes(place.id)}
            onSelect={() => onSelect([place.id])}
            onTable={onTable}
          />
        ))}
      </div>
    </article>
  );
}

export function SeatingQueue({ plan, disabled, selection, onSelect, onTable }: QueueProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"unassigned" | "assigned" | "all">("unassigned");
  const [side, setSide] = useState<PlanningGuest["side"] | "all">("all");
  const { entries, tablesByPlace } = useMemo(() => {
    const byGuest = new Map<string, Place[]>();
    for (const place of plan.places) {
      const list = byGuest.get(place.guestId) ?? [];
      list.push(place);
      byGuest.set(place.guestId, list);
    }
    const tables = new Map(plan.tables.map((t) => [t.id, t]));
    const tablesByPlace = new Map<string, Table>();
    for (const a of plan.assignments) {
      const table = tables.get(a.tableId);
      if (table) tablesByPlace.set(a.placeId, table);
    }
    return {
      entries: plan.guests.map((guest) => ({
        guest,
        places: (byGuest.get(guest.id) ?? []).sort((a, b) => a.position - b.position),
      })),
      tablesByPlace,
    };
  }, [plan]);
  const searched = entries.filter(
    ({ guest, places }) =>
      (side === "all" || guest.side === side) &&
      `${guest.recipientName} ${guest.group?.name ?? ""} ${sideLabels[guest.side]} ${places.map((p) => p.person?.fullName ?? "").join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(search.trim().toLocaleLowerCase("vi")),
  );
  const counts = {
    unassigned: searched.reduce(
      (n, e) => n + e.places.filter((p) => !tablesByPlace.has(p.id)).length,
      0,
    ),
    assigned: searched.reduce(
      (n, e) => n + e.places.filter((p) => tablesByPlace.has(p.id)).length,
      0,
    ),
    all: searched.reduce((n, e) => n + e.places.length, 0),
  };
  const visible = searched.filter(
    (e) =>
      filter === "all" ||
      e.places.some((p) =>
        filter === "assigned" ? tablesByPlace.has(p.id) : !tablesByPlace.has(p.id),
      ),
  );
  return (
    <>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Users className="size-4" aria-hidden="true" />
        Hàng chờ xếp chỗ
      </h2>
      <input
        aria-label="Tìm nhóm hoặc người nhận"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm tên, nhóm, phía…"
        className="w-full rounded-lg border bg-white p-2 text-sm"
      />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Trạng thái xếp chỗ">
        {(
          [
            ["unassigned", "Chưa xếp"],
            ["assigned", "Đã xếp"],
            ["all", "Tất cả"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full border px-2 py-1.5 text-[11px] focus-visible:outline-2 focus-visible:outline-primary",
              filter === value
                ? "border-primary bg-primary/10 font-semibold"
                : "border-transparent text-muted-foreground",
            )}
          >
            {label} ({counts[value]})
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Phía khách">
        {(
          [
            ["all", "Mọi phía"],
            ["GROOM", "Nhà trai"],
            ["BRIDE", "Nhà gái"],
            ["MUTUAL", "Chung"],
            ["UNSPECIFIED", "Chưa rõ"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={side === value}
            onClick={() => setSide(value)}
            className={cn(
              "rounded-full px-2 py-1 text-[10px] focus-visible:outline-2 focus-visible:outline-primary",
              side === value ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Số đếm theo người. Kéo tay cầm hoặc bấm chọn rồi bấm bàn.
      </p>
      <div
        className="max-h-[360px] space-y-2 overflow-y-auto p-0.5 lg:max-h-[620px]"
        aria-label="Danh sách chờ xếp chỗ"
      >
        {visible.map((entry) => {
          const firstPlace = entry.places[0];
          return entry.guest.invitationKind === "INDIVIDUAL" &&
            entry.places.length === 1 &&
            firstPlace ? (
            <GuestRow
              key={entry.guest.id}
              guest={entry.guest}
              place={firstPlace}
              individual
              table={tablesByPlace.get(firstPlace.id)}
              disabled={disabled}
              selected={selection.includes(firstPlace.id)}
              onSelect={() => onSelect([firstPlace.id])}
              onTable={onTable}
            />
          ) : (
            <GroupCard
              key={entry.guest.id}
              entry={entry}
              tablesByPlace={tablesByPlace}
              disabled={disabled}
              selection={selection}
              onSelect={onSelect}
              onTable={onTable}
            />
          );
        })}
        {!visible.length && (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            {!plan.guests.length
              ? "Chưa có khách. Nhập danh sách để bắt đầu."
              : filter === "unassigned" && !search && side === "all"
                ? "Đã xếp hết khách. Bạn có thể xem ở Đã xếp."
                : "Không có khách phù hợp bộ lọc."}
          </p>
        )}
      </div>
    </>
  );
}
