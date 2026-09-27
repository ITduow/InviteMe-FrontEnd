"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRuntime } from "@/core/config/runtime";
import { StatusBadge } from "@/shared/components/status-badge";
import { weddingKeys } from "../api/wedding.keys";
import { REALTIME_EVENTS } from "@/core/realtime/realtime-events";
export function WeddingRealtime({ weddingId }: { weddingId: string }) {
  const { realtime, queryClient } = useRuntime();
  const status = useSyncExternalStore(
    realtime.subscribe,
    realtime.getStatus,
    realtime.getServerStatus,
  );
  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: weddingKeys.detail(weddingId) });
      void queryClient.invalidateQueries({ queryKey: weddingKeys.lists() });
    };
    const unsubscribers = [
      realtime.onResync(invalidate),
      realtime.on(REALTIME_EVENTS.capacity, invalidate),
    ];
    void realtime.activate(weddingId);
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      void realtime.activate(null);
    };
  }, [weddingId, realtime, queryClient]);
  return (
    <StatusBadge
      tone={status === "connected" ? "success" : "neutral"}
      label={
        status === "connected"
          ? "Live updates connected"
          : status === "disabled"
            ? "Live updates unavailable"
            : "Live updates reconnecting"
      }
    />
  );
}
