"use client";

import { useEffect, useRef } from "react";
import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { env } from "@/core/config/env";

// Only connection retries use a timer; content is fetched on events and after joining/rejoining.
export function usePublicWeddingSignal(kind: "website" | "invitation", id: string, onChange: () => void) {
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  useEffect(() => {
    const base = env.signalrUrl ?? env.apiUrl;
    if (!base) return;
    const url = new URL("/hubs/public-weddings", base).toString();
    const connection = new HubConnectionBuilder().withUrl(url)
      .withAutomaticReconnect([0, 2000, 10000, 30000]).configureLogging(LogLevel.None).build();
    let stopped = false;
    let attempts = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const join = async () => {
      try { await connection.invoke(kind === "website" ? "JoinWebsite" : "JoinInvitation", id); }
      catch (error) {
        if (error instanceof Error && /WEBSITE_UNAVAILABLE|INVITATION_UNAVAILABLE|ONE_SUBSCRIPTION_PER_CONNECTION/.test(error.message)) stopped = true;
        throw error;
      }
      if (!stopped) callback.current();
    };
    const schedule = () => {
      if (stopped || retry) return;
      retry = setTimeout(() => { retry = undefined; void start(); }, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)));
    };
    const start = async () => {
      if (stopped || connection.state !== HubConnectionState.Disconnected) return;
      try {
        await connection.start();
        if (stopped) { await connection.stop(); return; }
        attempts = 0;
        await join();
      } catch {
        await connection.stop();
        schedule();
      }
    };
    connection.on("contentChanged", () => { if (!stopped) callback.current(); });
    connection.onreconnected(() => { void join().catch(() => connection.stop()); });
    connection.onclose(schedule);
    void start();
    return () => { stopped = true; if (retry) clearTimeout(retry); void connection.stop(); };
  }, [kind, id]);
}
