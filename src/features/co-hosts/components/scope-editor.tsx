"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CoHostPermission, PermissionScope } from "../api/co-host.api";
import { CO_HOST_PERMISSIONS } from "../api/co-host.api";
import {
  includeSeatingViewScope,
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
  const { t } = useTranslation("cohost");
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
      setError(t("validation.selectPermission"));
      return;
    }
    const validationMessage = scopeValidationMessage(grants, t);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError("");
    onSubmit(grants);
  }

  return (
    <div className="space-y-4 rounded-xl border border-foreground/10 bg-background p-4">
      <p className="text-sm text-muted-foreground">{t("scopeIntro")}</p>
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
              {t(`permissions.${permission}`)}
            </label>
            {scope.enabled && (
              <div className="space-y-3 pl-7">
                {permission === "CHECKIN_MANAGE" ? (
                  <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                    <p>{t("checkInWideHint")}</p>
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
                      <span>{t("confirmCheckInWide")}</span>
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
                      {t("wholeWedding")}
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
                      {t("selectedGroups")}
                    </label>
                  </>
                )}
                {permission === "SEATING_VIEW" && draft.SEATING_EDIT.enabled && (
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    {t("seatingViewCoverage")}
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
                      <p className="text-sm text-muted-foreground">{t("noGroupsHint")}</p>
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
        {busy ? t("saving") : submitLabel}
      </button>
    </div>
  );
}
