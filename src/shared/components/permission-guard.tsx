"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { WeddingAccess, WeddingPermission } from "@/core/auth/auth.types";
export const WeddingAccessContext = createContext<WeddingAccess | null>(null);
export function usePermission() {
  const access = useContext(WeddingAccessContext);
  return {
    can: (permission: WeddingPermission) => access?.permissions.includes(permission) ?? false,
  };
}
export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: WeddingPermission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePermission();
  return can(permission) ? children : fallback;
}
