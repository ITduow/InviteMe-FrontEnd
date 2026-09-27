"use client";
import { useEffect } from "react";
import { useRuntime } from "@/core/config/runtime";
export function SessionBootstrap() {
  const { session, realtime } = useRuntime();
  useEffect(() => {
    void session.bootstrap();
    return () => {
      void realtime.activate(null);
    };
  }, [session, realtime]);
  return null;
}
