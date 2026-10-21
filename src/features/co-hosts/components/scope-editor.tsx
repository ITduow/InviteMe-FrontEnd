"use client";

import { useState } from "react";
import type { CoHostPermission, PermissionScope } from "../api/co-host.api";
import { CO_HOST_PERMISSIONS } from "../api/co-host.api";
import {
  includeSeatingViewScope,
  PERMISSION_LABELS,
  scopeDraftFromGrants,
  scopeValidationMessage,
  type ScopeDraft,
} from "../utils/scopes";

export function ScopeEditor({
  groups,
  initialGrants,
  submitLabel,
  busy,
  onSubmit,
}: {
  groups: { id: string; name: string }[];
  initialGrants?: PermissionScope[] | null;
  submitLabel: string;
  busy: boolean;
  onSubmit: (grants: PermissionScope[]) => void;
}) {
  const [draft, setDraft] = useState<ScopeDraft>(() => scopeDraftFromGrants(initialGrants));
  const [error, setError] = useState("");

  function togglePermission(permission: CoHostPermission, enabled: boolean) {
    setDraft((current) =>
      includeSeatingViewScope({
        ...current,
        [permission]: { ...current[permission], enabled },
      }),
    );
  }

  function updateDraft(update: (current: ScopeDraft) => ScopeDraft) {
    setDraft((current) => includeSeatingViewScope(update(current)));
  }

  function save() {
    const grants = CO_HOST_PERMISSIONS.flatMap((permission) => {
      const scope = draft[permission];
      if (!scope.enabled) return [];
      return [
        {
          permission,
          weddingWide: scope.weddingWide,
          groupIds: scope.weddingWide ? [] : [...new Set(scope.groupIds)],
        },
      ];
    });
    if (!grants.length) {
      setError("Hãy chọn ít nhất một quyền.");
      return;
    }
    const validationMessage = scopeValidationMessage(grants);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError("");
    onSubmit(grants);
  }

  return (
    <div className="space-y-4 rounded-xl border border-foreground/10 bg-background p-4">
      <p className="text-sm text-muted-foreground">
        Mỗi quyền áp dụng cho toàn bộ đám cưới hoặc các nhóm khách đã chọn.
      </p>
      {CO_HOST_PERMISSIONS.map((permission) => {
        const scope = draft[permission];
        return (
          <fieldset key={permission} className="space-y-3 rounded-lg border p-4">
            <label className="flex cursor-pointer items-center gap-3 font-medium">
              <input
                type="checkbox"
                checked={scope.enabled}
                onChange={(event) => togglePermission(permission, event.currentTarget.checked)}
              />
              {PERMISSION_LABELS[permission]}
            </label>
            {scope.enabled && (
              <div className="space-y-3 pl-7">
                {permission === "CHECKIN_MANAGE" ? (
                  <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                    <p>
                      Check-in áp dụng trên toàn bộ khách của wedding, không giới hạn theo nhóm.
                    </p>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={scope.weddingWide}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          updateDraft((current) => ({
                            ...current,
                            CHECKIN_MANAGE: {
                              ...current.CHECKIN_MANAGE,
                              weddingWide: checked,
                              groupIds: [],
                            },
                          }));
                        }}
                      />
                      <span>Tôi xác nhận cấp quyền check-in cho toàn bộ wedding</span>
                    </label>
                  </div>
                ) : (
                  <>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`scope-${permission}`}
                        checked={scope.weddingWide}
                        onChange={() =>
                          updateDraft((current) => ({
                            ...current,
                            [permission]: {
                              ...current[permission],
                              weddingWide: true,
                              groupIds: [],
                            },
                          }))
                        }
                      />
                      Toàn bộ wedding
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`scope-${permission}`}
                        checked={!scope.weddingWide}
                        onChange={() =>
                          setDraft((current) => ({
                            ...current,
                            [permission]: { ...current[permission], weddingWide: false },
                          }))
                        }
                      />
                      Chỉ một số nhóm khách
                    </label>
                  </>
                )}
                {permission === "SEATING_VIEW" && draft.SEATING_EDIT.enabled && (
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Quyền xem sơ đồ được giữ bao phủ phạm vi chỉnh sửa để co-host có thể xếp bàn.
                  </p>
                )}
                {permission !== "CHECKIN_MANAGE" && !scope.weddingWide && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {groups.length ? (
                      groups.map((group) => (
                        <label
                          key={group.id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={scope.groupIds.includes(group.id)}
                            onChange={(event) => {
                              const checked = event.currentTarget.checked;
                              updateDraft((current) => {
                                const selected = current[permission].groupIds;
                                return {
                                  ...current,
                                  [permission]: {
                                    ...current[permission],
                                    groupIds: checked
                                      ? [...selected, group.id]
                                      : selected.filter((id) => id !== group.id),
                                  },
                                };
                              });
                            }}
                          />
                          {group.name}
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Chưa có nhóm khách. Hãy tạo nhóm trong danh sách khách hoặc cấp quyền toàn
                        đám cưới.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </fieldset>
        );
      })}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Đang lưu…" : submitLabel}
      </button>
    </div>
  );
}
