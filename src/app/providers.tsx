"use client";
import { useState, useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { createRuntime, RuntimeContext } from "@/core/config/runtime";
import { env } from "@/core/config/env";

export function Providers({ children }: { children: ReactNode }) {
  const [runtime] = useState(createRuntime);

  // On mount, attempt to restore the session via the HttpOnly refresh cookie.
  // This runs once per page load so an authenticated user doesn't lose their
  // session on F5. The result is silently ignored — components read from the
  // query cache via useCurrentUser().
  useEffect(() => {
    void runtime.session.restore();
  }, [runtime.session]);

  const content = (
    <RuntimeContext value={runtime}>
      <QueryClientProvider client={runtime.queryClient}>{children}</QueryClientProvider>
    </RuntimeContext>
  );

  if (env.googleClientId) {
    return <GoogleOAuthProvider clientId={env.googleClientId}>{content}</GoogleOAuthProvider>;
  }

  return content;
}
