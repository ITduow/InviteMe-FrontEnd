import test from "node:test";
import assert from "node:assert/strict";
import { importBody } from "../src/features/guests/api/planning.api";
import { validateCoupleRows } from "../src/features/guests/utils/couple-import";
import { normalizeHttpError } from "../src/core/api/api-error";

test("import maps expected places including primary, explicit side and family without fabricating companions", () => {
  const rows = validateCoupleRows([
    {
      line: 8,
      values: ["Nguyễn Văn An", "Bác", "Gia đình", "4", "Nhà gái", "Họ ngoại", "", "Hai trẻ nhỏ"],
    },
  ]);
  assert.deepEqual(importBody(rows), {
    rows: [
      {
        rowNumber: 8,
        recipientName: "Nguyễn Văn An",
        honorific: "Bác",
        invitationKind: "FAMILY",
        expectedPeople: 4,
        side: "BRIDE",
        group: { newName: "Họ ngoại", confirmed: true },
        phone: null,
        note: "Hai trẻ nhỏ",
      },
    ],
  });
});
test("missing side stays unspecified, group optional, count includes representative", () => {
  const rows = validateCoupleRows([{ line: 2, values: ["Hoa", "", "", "", "", "", "", ""] }]);
  const row = importBody(rows).rows[0];
  assert.equal(row?.side, "UNSPECIFIED");
  assert.equal(row?.expectedPeople, 1);
  assert.equal(row?.group, null);
});
test("row errors preserve only allowed row and field metadata, never backend message", () => {
  const error = normalizeHttpError(422, {
    errors: [
      { rowNumber: 8, field: "expectedPeople", message: "secret database detail" },
      { rowNumber: 9, field: "unexpectedField" },
    ],
  });
  assert.deepEqual(Object.keys(error.fieldErrors), ["rows.8.expectedPeople"]);
  assert.doesNotMatch(JSON.stringify(error.fieldErrors), /secret/);
});
