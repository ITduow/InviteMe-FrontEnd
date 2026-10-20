import { createStore } from "zustand/vanilla";
import type { SeatingDragPointer, SeatingDragSnapshot } from "@/core/realtime/seating-drag-events";

export function createSeatingCollaborationStore(weddingId: string) {
  const targets = new Map<
    string,
    { sequence: number; tableId: string | null; seatNumber: number | null }
  >();
  return createStore<{
    revision: number;
    leases: SeatingDragSnapshot["leases"];
    replace: (snapshot: SeatingDragSnapshot) => void;
    updateTarget: (pointer: SeatingDragPointer) => void;
    reset: () => void;
  }>((set) => ({
    revision: -1,
    leases: [],
    replace: (snapshot) =>
      set((current) => {
        if (snapshot.weddingId !== weddingId || snapshot.revision < current.revision)
          return current;
        const active = new Set(snapshot.leases.map((lease) => lease.dragId));
        for (const id of targets.keys()) if (!active.has(id)) targets.delete(id);
        return {
          revision: snapshot.revision,
          leases: snapshot.leases.map((lease) => {
            const target = targets.get(lease.dragId);
            return target && target.sequence > (lease.targetSequence ?? 0)
              ? {
                  ...lease,
                  tableId: target.tableId,
                  seatNumber: target.seatNumber,
                  targetSequence: target.sequence,
                }
              : lease;
          }),
        };
      }),
    updateTarget: (pointer) =>
      set((current) => {
        if (pointer.weddingId !== weddingId || !pointer.hasTarget) return current;
        const lease = current.leases.find(
          (item) => item.dragId === pointer.dragId && item.connectionId === pointer.connectionId,
        );
        if (
          !lease ||
          pointer.sequence <=
            Math.max(lease.targetSequence ?? -1, targets.get(pointer.dragId)?.sequence ?? -1)
        )
          return current;
        const target = {
          sequence: pointer.sequence,
          tableId: pointer.tableId ?? null,
          seatNumber: pointer.seatNumber ?? null,
        };
        targets.set(pointer.dragId, target);
        if (lease.tableId === target.tableId && lease.seatNumber === target.seatNumber)
          return current;
        return {
          leases: current.leases.map((item) =>
            item === lease
              ? {
                  ...item,
                  tableId: target.tableId,
                  seatNumber: target.seatNumber,
                  targetSequence: target.sequence,
                }
              : item,
          ),
        };
      }),
    reset: () => {
      targets.clear();
      set({ revision: -1, leases: [] });
    },
  }));
}
