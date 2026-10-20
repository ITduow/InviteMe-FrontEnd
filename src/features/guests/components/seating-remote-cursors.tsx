"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MousePointer2 } from "lucide-react";
import { useRuntime } from "@/core/config/runtime";
import type { SeatingDragPointer, SeatingDragPresence } from "@/core/realtime/seating-drag-events";
import type { SeatingPlan } from "../api/planning-seating.api";
import { seatingDropFeedback } from "../utils/seating-drag-preview";
import { SeatingDragPreview } from "./seating-drag-preview";
import { DraggingLabel } from "./seating-drag-presence";

function RemoteCursor({
  pointer,
  presence,
  plan,
}: {
  pointer: SeatingDragPointer;
  presence: SeatingDragPresence;
  plan: SeatingPlan;
}) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame: number | undefined;
    const position = () => {
      frame = undefined;
      const element = node.current;
      const anchor = document.querySelector<HTMLElement>(
        `[data-seating-pointer-anchor="${pointer.anchor}"]`,
      );
      if (!element) return;
      if (!anchor) {
        element.hidden = true;
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const rawX = rect.left + rect.width * pointer.x;
      const rawY = rect.top + rect.height * pointer.y;
      const x = Math.max(12, Math.min(innerWidth - 12, rawX));
      const y = Math.max(12, Math.min(innerHeight - 12, rawY));
      element.hidden = false;
      element.dataset.offscreen = String(
        rawX < 0 || rawY < 0 || rawX > innerWidth || rawY > innerHeight,
      );
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      // Keep the chip visible when the pointer approaches the viewport's right/bottom edge.
      element.style.setProperty("--chip-x", x > innerWidth - 260 ? "-245px" : "14px");
      element.style.setProperty("--chip-y", y > innerHeight - 200 ? "-190px" : "12px");
    };
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(position);
    };
    schedule();
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
    };
  }, [pointer]);
  const feedback = presence.tableId
    ? seatingDropFeedback(plan, presence.placeIds, {
        tableId: presence.tableId,
        ...(presence.seatNumber ? { seatNumber: presence.seatNumber } : {}),
      })
    : null;
  return (
    <div
      ref={node}
      hidden
      data-testid="seating-remote-drag"
      aria-hidden="true"
      className="group pointer-events-none fixed left-0 top-0 z-[80] select-none transition-transform duration-75 ease-linear motion-reduce:transition-none"
    >
      <MousePointer2 className="size-5 fill-primary text-primary drop-shadow group-data-[offscreen=true]:invisible" />
      <div className="absolute left-[var(--chip-x)] top-[var(--chip-y)] space-y-1">
        <span className="inline-flex rounded-full border bg-white px-2 py-1 shadow-sm">
          <DraggingLabel presence={presence} />
        </span>
        <p className="hidden rounded bg-white px-2 py-1 text-[10px] text-muted-foreground group-data-[offscreen=true]:block">
          Ngoài vùng đang xem ·{" "}
          {pointer.anchor === "queue"
            ? "Hàng chờ"
            : pointer.anchor === "board"
              ? "Sơ đồ"
              : (plan.tables.find((table) => `table:${table.id}` === pointer.anchor)?.name ??
                "Bàn")}
        </p>
        <SeatingDragPreview plan={plan} ids={presence.placeIds} feedback={feedback} />
      </div>
    </div>
  );
}

// Pointer packets only rerender this overlay, not the seating board or guest queue.
export function SeatingRemoteCursors({
  weddingId,
  leases,
  plan,
}: {
  weddingId: string;
  leases: SeatingDragPresence[];
  plan: SeatingPlan;
}) {
  const { realtime } = useRuntime();
  const [pointers, setPointers] = useState<Record<string, SeatingDragPointer>>({});
  useEffect(() => {
    const latest = new Map<string, SeatingDragPointer>();
    let frame: number | undefined;
    const stop = realtime.onSeatingPointer((pointer) => {
      if (pointer.weddingId !== weddingId) return;
      const old = latest.get(pointer.connectionId);
      if (old?.dragId === pointer.dragId && old.sequence >= pointer.sequence) return;
      latest.set(pointer.connectionId, pointer);
      const oldest = latest.keys().next().value;
      if (latest.size > 32 && oldest !== undefined) latest.delete(oldest);
      if (frame === undefined)
        frame = requestAnimationFrame(() => {
          frame = undefined;
          setPointers(Object.fromEntries(latest));
        });
    });
    const stopStatus = realtime.subscribe(() => {
      if (realtime.getStatus() !== "connected") {
        latest.clear();
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = undefined;
        setPointers({});
      }
    });
    return () => {
      stop();
      stopStatus();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [realtime, weddingId]);
  if (typeof document === "undefined") return null;
  return createPortal(
    leases.map((lease) => {
      const pointer = pointers[lease.connectionId];
      return pointer?.dragId === lease.dragId && pointer.weddingId === weddingId ? (
        <RemoteCursor key={lease.dragId} pointer={pointer} presence={lease} plan={plan} />
      ) : null;
    }),
    document.body,
  );
}
