import type { WeddingAccess, WeddingPermission } from "./auth.types";

export function isWeddingWidePermission(
  access: WeddingAccess | null,
  permission: WeddingPermission,
) {
  if (access?.isOwner) return true;
  return access?.scopes?.find((scope) => scope.permission === permission)?.weddingWide ?? false;
}
