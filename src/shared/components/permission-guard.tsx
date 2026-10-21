"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { WeddingAccess, WeddingPermission } from "@/core/auth/auth.types";
import { isWeddingWidePermission } from "@/core/auth/wedding-access";
export const WeddingAccessContext = createContext<WeddingAccess | null>(null);
export function usePermission() {
  const access = useContext(WeddingAccessContext);
  return {
    isOwner: access?.isOwner === true,
    access,
    can: (permission: WeddingPermission) => access?.permissions.includes(permission) ?? false,
    scope: (permission: WeddingPermission) =>
      access?.scopes?.find((item) => item.permission === permission),
    isWeddingWide: (permission: WeddingPermission) => isWeddingWidePermission(access, permission),
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
