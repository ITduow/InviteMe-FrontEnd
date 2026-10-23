"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { addGroup, groupSuggestions, unknownGroups } from "../utils/group-catalog";
import type { CoupleRow } from "../utils/couple-import";

function UnknownGroup({
  item,
  catalog,
  onResolve,
  onCreate,
}: {
  item: ReturnType<typeof unknownGroups>[number];
  catalog: string[];
  onResolve: (key: string, label: string) => void;
  onCreate: (key: string, label: string) => void;
}) {
  const { t, i18n } = useTranslation("guestPlanning", { keyPrefix: "importPage.groupReview" });
  const [target, setTarget] = useState("");
  const [name, setName] = useState(item.label);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");
  const suggestions = groupSuggestions(item.label, catalog);
  const sideLabel = (side?: string) => {
    if (side === "Nhà gái") return i18n.t("importPage.enums.bride", { ns: "guestPlanning" });
    if (side === "Nhà trai") return i18n.t("importPage.enums.groom", { ns: "guestPlanning" });
    if (side === "Chung") return i18n.t("importPage.enums.shared", { ns: "guestPlanning" });
    return side || t("unknownSide");
  };
  return (
    <article className="space-y-4 rounded-xl border border-amber-200 bg-card p-4">
      <div>
        <h3 className="font-medium">
          “{item.label}”{" "}
          <span className="text-xs font-normal text-amber-900">{t("unrecognized")}</span>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("rowSide", { rows: item.lines.join(", "), side: sideLabel(item.side) })}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-medium">{t("useExisting")}</p>
          <label className="block space-y-1 text-xs">
            <span>{t("mapLabel", { name: item.label, side: sideLabel(item.side) })}</span>
            <select
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">{t("chooseGroup")}</option>
              {catalog.map((label) => (
                <option key={label}>{label}</option>
              ))}
            </select>
          </label>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span>{t("suggestions")}</span>
              {suggestions.map((label) => (
                <button
                  type="button"
                  key={label}
                  className="rounded-full border px-2 py-1 underline"
                  onClick={() => setTarget(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" disabled={!target} onClick={() => onResolve(item.key, target)}>
            {t("applyExisting")}
          </Button>
        </div>
        <form
          className="space-y-3 border-t pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ack) return;
            try {
              const result = addGroup(catalog, name);
              onCreate(item.key, result.label);
            } catch {
              setError(t("invalidName"));
            }
          }}
        >
          <p className="text-sm font-medium">{t("createNew")}</p>
          <label className="block space-y-1 text-xs">
            <span>{t("newGroupLabel", { name: item.label, side: sideLabel(item.side) })}</span>
            <input
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              required
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setAck(false);
              }}
            />
          </label>
          <label className="flex items-start gap-2 text-xs leading-5">
            <input
              className="mt-1"
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            {t("confirmGroup")}
          </label>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button disabled={!ack || !name.trim()} type="submit">
            {t("confirmNew")}
          </Button>
        </form>
      </div>
    </article>
  );
}

export function ImportGroupReview({
  rows,
  catalog,
  onResolve,
  onCreate,
}: {
  rows: CoupleRow[];
  catalog: string[];
  onResolve: (key: string, label: string) => void;
  onCreate: (key: string, label: string) => void;
}) {
  const { t } = useTranslation("guestPlanning", { keyPrefix: "importPage.groupReview" });
  const pending = unknownGroups(rows, catalog);
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5" aria-label={t("aria")}>
      <div>
        <h2 className="font-serif text-2xl">{t("title")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {pending.length ? t("pending", { count: pending.length }) : t("matched")}
        </p>
      </div>
      <details className="rounded-lg border bg-background p-3">
        <summary className="cursor-pointer text-sm">
          {t("catalog", { count: catalog.length })}
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {catalog.map((label) => (
            <span key={label} className="rounded-full border bg-card px-3 py-1 text-xs">
              {label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("catalogHelp")}</p>
      </details>
      {pending.map((item) => (
        <UnknownGroup
          key={item.key}
          item={item}
          catalog={catalog}
          onResolve={onResolve}
          onCreate={onCreate}
        />
      ))}
    </section>
  );
}
