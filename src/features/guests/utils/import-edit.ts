import type { Preview } from "../schemas/guest.schema";

export const importHeaders = [
  "Mã nhóm mời",
  "Họ và tên",
  "Vai trò",
  "Số điện thoại",
  "Email",
  "Phía khách mời",
  "Mối quan hệ",
  "Nhóm khách",
  "Số người được thêm",
  "Ghi chú",
] as const;
export type DraftRow = { rowNumber: number; values: Record<string, string> };
export function canEditPreview(preview: Preview) {
  return (
    preview.formatVersion === 2 &&
    preview.rows.every(
      (row) => row.rawValues && importHeaders.every((header) => header in (row.rawValues ?? {})),
    )
  );
}
export function editedCsv(preview: Preview, edits: DraftRow[]) {
  if (!canEditPreview(preview))
    throw new Error("File có dòng sai cấu trúc. Sửa file gốc và tải lại.");
  const changes = new Map(edits.map((row) => [row.rowNumber, row.values]));
  if (
    changes.size !== edits.length ||
    edits.some((row) => !preview.rows.some((original) => original.rowNumber === row.rowNumber))
  )
    throw new Error("Dòng sửa không thuộc phiên kiểm tra.");
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = [importHeaders.map(quote).join(",")];
  for (const row of [...preview.rows].sort((a, b) => a.rowNumber - b.rowNumber)) {
    while (lines.length < row.rowNumber - 1) lines.push(importHeaders.map(() => "").join(","));
    const values = changes.get(row.rowNumber) ?? row.rawValues ?? {};
    lines.push(importHeaders.map((header) => quote(values[header] ?? "")).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}
