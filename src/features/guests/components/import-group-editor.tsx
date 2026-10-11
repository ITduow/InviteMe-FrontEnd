"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/feedback/error-state";
import type { Preview } from "../schemas/guest.schema";
import { importHeaders, type DraftRow } from "../utils/import-edit";

type Options = {
  sides: { code: string; label: string }[];
  relationships: { code: string; label: string }[];
  participantRoles?: { code: string; label: string }[] | null;
};
export function ImportGroupEditor({
  rows,
  issues,
  options,
  busy,
  error,
  onClose,
  onSave,
}: {
  rows: Preview["rows"];
  issues: Preview["errors"];
  options: Options;
  busy: boolean;
  error: unknown;
  onClose: () => void;
  onSave: (rows: DraftRow[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<DraftRow[]>(() =>
    rows.map((row) => ({ rowNumber: row.rowNumber, values: { ...row.rawValues } })),
  );
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function update(number: number, header: string, value: string) {
    setDraft((current) =>
      current.map((row) =>
        row.rowNumber === number ? { ...row, values: { ...row.values, [header]: value } } : row,
      ),
    );
  }
  const dictionaries: Record<string, { code: string; label: string }[]> = {
    "Vai trò": options.participantRoles ?? [],
    "Phía khách mời": options.sides,
    "Mối quan hệ": options.relationships,
  };
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      aria-labelledby="import-edit-title"
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-2xl overflow-y-auto border-l bg-card p-0 text-foreground shadow-xl backdrop:bg-foreground/25"
    >
      <header className="flex items-center justify-between border-b p-6">
        <div>
          <p className="text-xs text-muted-foreground">Thông tin trước khi import</p>
          <h2 id="import-edit-title" className="mt-2 font-serif text-2xl">
            Chi tiết / Sửa nhóm mời
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          aria-label="Đóng sửa nhóm"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        className="space-y-5 p-6"
      >
        <p className="text-sm text-muted-foreground">
          Chưa lưu vào danh sách khách. Lưu sẽ kiểm tra lại toàn bộ file, gồm cả mã nhóm và khách
          trùng.
        </p>
        {draft.map((row) => (
          <fieldset key={row.rowNumber} disabled={busy} className="space-y-4 rounded-xl border p-4">
            <legend className="px-2 text-sm font-medium">
              Dòng {row.rowNumber} · {row.values["Họ và tên"] || "Thiếu tên"}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {importHeaders.map((header) => {
                const choices = dictionaries[header];
                const value = row.values[header] ?? "";
                const isPrimary = ["PRIMARY", "Người đại diện"].includes(
                  row.values["Vai trò"] ?? "",
                );
                if (importHeaders.indexOf(header) > 2 && !isPrimary && !value) return null;
                const id = `edit-${row.rowNumber}-${importHeaders.indexOf(header)}`;
                return (
                  <label
                    key={header}
                    htmlFor={id}
                    className={`space-y-1 text-sm ${header === "Ghi chú" ? "sm:col-span-2" : ""}`}
                  >
                    <span>{header}</span>
                    {choices ? (
                      <select
                        id={id}
                        value={value}
                        onChange={(event) => update(row.rowNumber, header, event.target.value)}
                        className="w-full rounded-md border bg-background p-2"
                      >
                        <option value="">Chưa chọn</option>
                        {value &&
                          !choices.some(
                            (choice) => choice.code === value || choice.label === value,
                          ) && <option value={value}>{value} (không hợp lệ)</option>}
                        {choices.map((choice) => (
                          <option key={choice.code} value={choice.label}>
                            {choice.label}
                          </option>
                        ))}
                        {choices.some((choice) => choice.code === value) && (
                          <option value={value}>
                            {choices.find((choice) => choice.code === value)?.label}
                          </option>
                        )}
                      </select>
                    ) : header === "Ghi chú" ? (
                      <textarea
                        id={id}
                        value={value}
                        onChange={(event) => update(row.rowNumber, header, event.target.value)}
                        className="w-full rounded-md border bg-background p-2"
                        rows={3}
                      />
                    ) : (
                      <input
                        id={id}
                        value={value}
                        onChange={(event) => update(row.rowNumber, header, event.target.value)}
                        className="w-full rounded-md border bg-background p-2"
                        inputMode={header === "Số người được thêm" ? "numeric" : undefined}
                      />
                    )}
                  </label>
                );
              })}
            </div>
            {issues
              .filter((issue) => issue.rowNumber === row.rowNumber)
              .map((issue, index) => (
                <p key={index} className="text-sm text-destructive">
                  {issue.column}: {issue.message}
                </p>
              ))}
          </fieldset>
        ))}
        <p className="text-xs text-muted-foreground">
          Muốn đổi mã cả gia đình, sửa cùng mã trên các dòng. Thành viên chỉ giữ mã, tên và vai trò;
          xóa thông tin nhập nhầm ở các ô còn lại.
        </p>
        {error != null && <ErrorState error={error} />}
        <footer className="sticky bottom-0 flex justify-end gap-3 border-t bg-card py-4">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Đang kiểm tra lại…" : "Lưu và kiểm tra lại"}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
