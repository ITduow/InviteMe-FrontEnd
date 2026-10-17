import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { PlatformRole } from "@/core/auth/auth.types";

// Fail closed until the replacement login/session flow is implemented.
export function AuthGuard(props: { children: ReactNode; role?: PlatformRole }): never {
  redirect(
    `/login?returnTo=${encodeURIComponent(props.role === "ADMIN" ? "/admin/dashboard" : "/dashboard")}`,
  );
}
