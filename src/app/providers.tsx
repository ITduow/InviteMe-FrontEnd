"use client";
import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRuntime, RuntimeContext } from "@/core/config/runtime";
import { SessionBootstrap } from "@/features/auth";
export function Providers({ children }: { children: ReactNode }) {
  const [runtime] = useState(createRuntime);
  return (
    <RuntimeContext value={runtime}>
      <QueryClientProvider client={runtime.queryClient}>
        <SessionBootstrap />
        {children}
      </QueryClientProvider>
    </RuntimeContext>
  );
}
