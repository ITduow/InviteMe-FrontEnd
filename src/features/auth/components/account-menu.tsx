"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRuntime } from "@/core/config/runtime";
import { env } from "@/core/config/env";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import { useCurrentUser } from "../hooks/use-current-user";
import { authApi } from "../api/auth.api";
export function AccountMenu() {
  const { api, session } = useRuntime();
  const user = useCurrentUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  async function logout() {
    setBusy(true);
    setError(undefined);
    try {
      if (env.refreshEnabled) await authApi.logout(api);
      session.clear();
      router.replace("/login");
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">{user.data?.displayName}</span>
      <Button variant="outline" size="sm" onClick={() => void logout()} disabled={busy}>
        Sign out
      </Button>
      {error !== undefined && <ErrorState error={error} retry={() => void logout()} />}
    </div>
  );
}
