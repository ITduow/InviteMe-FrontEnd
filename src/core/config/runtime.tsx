"use client";
import { createContext, useContext } from "react";
import { createApiClient } from "../api/api-client";
import { createQueryClient } from "../query/query-client";
import { RealtimeClient } from "../realtime/signalr-client";
import { env } from "./env";

// Registration is public. Authenticated transport will be wired with the new login flow.
export function createRuntime() {
  return {
    queryClient: createQueryClient(),
    api: createApiClient(env.apiUrl),
    realtime: new RealtimeClient(undefined, async () => null),
  };
}
export type Runtime = ReturnType<typeof createRuntime>;
export const RuntimeContext = createContext<Runtime | null>(null);
export function useRuntime() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("Runtime provider is missing");
  return runtime;
}
