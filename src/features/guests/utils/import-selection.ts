import type { Preview } from "../schemas/guest.schema";
export function importUnits(preview: Preview) {
  const errors = new Set(preview.errors.map((issue) => issue.rowNumber));
  if (preview.formatVersion === 2)
    return (preview.groups ?? []).map((group) => ({
      key: group.groupKey,
      code: group.code,
      members: group.members,
      allowance: group.additionalAllowance,
      valid: !group.members.some((row) => errors.has(row.rowNumber)),
    }));
  return preview.rows.map((row) => ({
    key: String(row.rowNumber),
    code: null,
    members: [row],
    allowance: row.maxPlusOne,
    valid: !errors.has(row.rowNumber),
  }));
}
export function confirmation(preview: Preview, selected: string[], acknowledgeDuplicates: boolean) {
  const valid = new Set(
    importUnits(preview)
      .filter((unit) => unit.valid)
      .map((unit) => unit.key),
  );
  const keys = [...new Set(selected)].filter((key) => valid.has(key));
  return {
    importId: preview.importId,
    acknowledgeDuplicates,
    ...(preview.formatVersion === 2 ? { groupKeys: keys } : { rowNumbers: keys.map(Number) }),
  };
}
export function validateFile(file: Pick<File, "name" | "size">) {
  if (!/\.(csv|xlsx)$/i.test(file.name))
    return "Chọn file .csv hoặc .xlsx (không hỗ trợ .xls, .xlsm).";
  if (file.size === 0 || file.size > 5 * 1024 * 1024)
    return "File phải có dữ liệu và không vượt quá 5 MB.";
  return null;
}
