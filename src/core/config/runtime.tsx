"use client";
import { createContext, useContext } from "react";
import { createApiClient } from "../api/api-client";
import { createQueryClient } from "../query/query-client";
import { RealtimeClient } from "../realtime/signalr-client";
import { SessionManager } from "../auth/session-manager";
import { env } from "./env";

export function createRuntime() {
  const session = new SessionManager();
  const api = createApiClient(env.apiUrl, session);
  const queryClient = createQueryClient();
  const realtime = new RealtimeClient(undefined, async () => null);
  return { queryClient, api, session, realtime };
}

export type Runtime = ReturnType<typeof createRuntime>;
export const RuntimeContext = createContext<Runtime | null>(null);
export function useRuntime() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("Runtime provider is missing");
  return runtime;
}
