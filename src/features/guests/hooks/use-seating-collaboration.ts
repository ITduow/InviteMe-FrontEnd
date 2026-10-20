"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import { useRuntime } from "@/core/config/runtime";
import {
  seatingDragLeaseSchema,
  seatingDragSnapshotSchema,
  type SeatingDragLease,
} from "@/core/realtime/seating-drag-events";
import { createSeatingCollaborationStore } from "../stores/seating-collaboration";
import type { SeatingDropPosition } from "../utils/seating-drag-preview";

type Operation = {
  ids: string[];
  pending: Promise<SeatingDragLease>;
  cancelled: boolean;
  saving: boolean;
  lease?: SeatingDragLease;
};

export function useSeatingCollaboration(
  weddingId: string,
  onAbort: () => void,
  onError: () => void,
) {
  const { realtime } = useRuntime();
  const store = useMemo(() => createSeatingCollaborationStore(weddingId), [weddingId]);
  const leases = useStore(store, (state) => state.leases);
  const active = useRef<Operation | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTarget = useRef<string | undefined>(undefined);

  const release = useCallback(
    (lease: SeatingDragLease) => {
      void realtime.invokeSeating("EndSeatingDrag", weddingId, lease.token).catch(() => undefined);
    },
    [realtime, weddingId],
  );
  const cancel = useCallback(
    (notify = true) => {
      const operation = active.current;
      if (operation?.saving) return;
      active.current = null;
      clearInterval(heartbeat.current);
      clearTimeout(hoverTimer.current);
      lastTarget.current = undefined;
      if (operation) {
        operation.cancelled = true;
        if (operation.lease) release(operation.lease);
      }
      if (operation && notify) onAbort();
    },
    [onAbort, release],
  );

  useEffect(() => {
    let disposed = false;
    const load = () => {
      void realtime
        .invokeSeating("GetSeatingDrags", weddingId)
        .then((snapshot) => {
          if (!disposed) store.getState().replace(seatingDragSnapshotSchema.parse(snapshot));
        })
        .catch(() => {
          if (!disposed) onError();
        });
    };
    const stopSnapshots = realtime.onSeatingDrags((snapshot) => store.getState().replace(snapshot));
    const stopResync = realtime.onResync(load);
    const stopStatus = realtime.subscribe(() => {
      if (realtime.getStatus() !== "connected") {
        cancel();
        store.getState().reset();
      }
    });
    if (realtime.getStatus() === "connected") load();
    const onHidden = () => {
      if (document.hidden) cancel();
    };
    const onBlur = () => cancel();
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      disposed = true;
      stopSnapshots();
      stopResync();
      stopStatus();
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHidden);
      cancel(false);
    };
  }, [realtime, weddingId, store, cancel, onError]);

  function begin(ids: string[]) {
    cancel(false);
    const operation: Operation = {
      ids: [...ids],
      cancelled: false,
      saving: false,
      pending: realtime
        .invokeSeating("StartSeatingDrag", weddingId, ids)
        .then((value) => seatingDragLeaseSchema.parse(value)),
    };
    active.current = operation;
    void operation.pending
      .then((lease) => {
        operation.lease = lease;
        if (operation.cancelled) {
          release(lease);
          return;
        }
        heartbeat.current = setInterval(() => {
          void realtime.invokeSeating("RenewSeatingDrag", weddingId, lease.token).catch(() => {
            if (active.current === operation && !operation.saving) {
              cancel();
              onError();
            }
          });
        }, 5_000);
      })
      .catch(() => {
        if (active.current === operation) {
          cancel();
          onError();
        }
      });
    return operation;
  }

  async function run<T>(ids: string[], work: (token: string) => Promise<T>): Promise<T> {
    const current = active.current;
    const operation =
      current &&
      !current.cancelled &&
      ids.length === current.ids.length &&
      ids.every((id) => current.ids.includes(id))
        ? current
        : begin(ids);
    const lease = await operation.pending;
    if (operation.cancelled) throw new Error("SEATING_DRAG_CANCELLED");
    try {
      await realtime.invokeSeating("RenewSeatingDrag", weddingId, lease.token);
      if (operation.cancelled) throw new Error("SEATING_DRAG_CANCELLED");
      operation.saving = true;
      clearTimeout(hoverTimer.current);
      return await work(lease.token);
    } finally {
      operation.saving = false;
      cancel(false);
    }
  }

  function hover(target: SeatingDropPosition | null) {
    const key = JSON.stringify(target);
    if (key === lastTarget.current) return;
    lastTarget.current = key;
    clearTimeout(hoverTimer.current);
    const operation = active.current;
    if (!operation) return;
    hoverTimer.current = setTimeout(() => {
      void operation.pending
        .then((lease) => {
          if (!operation.cancelled && !operation.saving)
            return realtime.invokeSeating(
              "TargetSeatingDrag",
              weddingId,
              lease.token,
              target?.tableId ?? null,
              target?.seatNumber ?? null,
            );
        })
        .catch(() => {
          if (active.current === operation) {
            cancel();
            onError();
          }
        });
    }, 100);
  }
  return { begin, cancel, run, hover, leases, connectionId: realtime.getConnectionId() };
}
