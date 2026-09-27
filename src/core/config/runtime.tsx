"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { createApiClient } from "../api/api-client";
import { tokenResponseSchema } from "../auth/auth.types";
import { Session } from "../auth/session";
import { createQueryClient } from "../query/query-client";
import { RealtimeClient } from "../realtime/signalr-client";
import { env } from "./env";

export function createRuntime() {
  const queryClient = createQueryClient();
  const anonymousApi = createApiClient(env.apiUrl);
  const session = new Session({
    refreshEnabled: env.refreshEnabled,
    refresh: () =>
      anonymousApi.request("/auth/refresh", {
        method: "POST",
        auth: "none",
        cookieAuth: true,
        schema: tokenResponseSchema,
      }),
    onClear: () => {
      queryClient.clear();
      void realtime.activate(null);
    },
  });
  const realtime = new RealtimeClient(env.signalrUrl, () => session.getToken());
  return { queryClient, session, realtime, api: createApiClient(env.apiUrl, session) };
}
export type Runtime = ReturnType<typeof createRuntime>;
export const RuntimeContext = createContext<Runtime | null>(null);
export function useRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("Runtime provider is missing");
  return value;
}
export function useSessionStatus() {
  const { session } = useRuntime();
  return useSyncExternalStore(session.subscribe, session.getStatus, session.getServerStatus);
}
