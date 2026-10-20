import { createStore } from "zustand/vanilla";
import type { SeatingDragSnapshot } from "@/core/realtime/seating-drag-events";

export function createSeatingCollaborationStore(weddingId: string) {
  return createStore<{
    revision: number;
    leases: SeatingDragSnapshot["leases"];
    replace: (snapshot: SeatingDragSnapshot) => void;
    reset: () => void;
  }>((set) => ({
    revision: -1,
    leases: [],
    replace: (snapshot) =>
      set((current) =>
        snapshot.weddingId === weddingId && snapshot.revision >= current.revision
          ? { revision: snapshot.revision, leases: snapshot.leases }
          : current,
      ),
    reset: () => set({ revision: -1, leases: [] }),
  }));
}
