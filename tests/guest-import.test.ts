import { test } from "node:test";
import assert from "node:assert/strict";
import { previewSchema } from "../src/features/guests/schemas/guest.schema";
import {
  confirmation,
  importUnits,
  validateFile,
} from "../src/features/guests/utils/import-selection";
import { previewFile, confirmFile, getGuests } from "../src/features/guests/api/guest.api";
import { createApiClient } from "../src/core/api/api-client";
import { Session } from "./helpers/api-session";
import {
  canEditPreview,
  editedCsv,
  importHeaders,
  legacyImportHeaders,
} from "../src/features/guests/utils/import-edit";

test("legacy editing keeps nine headers and untouched invalid values while fixing a row", () => {
  const data = fixture();
  data.formatVersion = 1;
  data.groups = null;
  data.rows.forEach((row) => {
    row.rawValues = Object.fromEntries(legacyImportHeaders.map((header) => [header, ""]));
    row.rawValues["Họ và tên"] = row.fullName;
  });
  data.rows[0]!.rawValues!["Email"] = "bad-email";
  data.rows[1]!.rawValues!["Số người đi kèm dự kiến"] = "-5";
  assert.equal(canEditPreview(data), true);
  const csv = editedCsv(data, [
    { rowNumber: 2, values: { ...data.rows[0]!.rawValues!, Email: "valid@example.test" } },
  ]);
  assert.equal(csv.split("\r\n")[0], "\uFEFF" + legacyImportHeaders.map((h) => `"${h}"`).join(","));
  assert.ok(csv.includes('"valid@example.test"'));
  assert.ok(csv.includes('"-5"'));
  assert.equal(data.rows[0]!.rawValues!["Email"], "bad-email");
  assert.ok(!csv.includes("Vai trò"));
});

test("editing preserves invalid untouched cells, empty member metadata and spreadsheet row numbers", () => {
  const preview = fixture();
  preview.rows.forEach((row) => {
    row.rawValues = Object.fromEntries(importHeaders.map((header) => [header, ""]));
    row.rawValues["Họ và tên"] = row.fullName;
  });
  preview.rows[4]!.rawValues!["Phía khách mời"] = "Sai phía";
  preview.rows[4]!.rawValues!["Số người được thêm"] = "-5";
  preview.rows[4]!.rowNumber = 8;
  const values = { ...preview.rows[0]!.rawValues!, "Họ và tên": 'An, "Bình"' };
  const csv = editedCsv(preview, [{ rowNumber: 2, values }]);
  assert.ok(csv.includes('"An, ""Bình"""'));
  assert.ok(csv.includes('"Sai phía"'));
  assert.ok(csv.includes('"-5"'));
  assert.equal(csv.split("\r\n").length, 8);
  assert.equal(preview.rows[0]!.fullName, "Person 2");
  preview.rows[1]!.rawValues = null;
  assert.equal(canEditPreview(preview), false);
  assert.throws(() => editedCsv(preview, []));
});

function fixture() {
  const row = (rowNumber: number, participantType = "PRIMARY") => ({
    rowNumber,
    fullName: `Person ${rowNumber}`,
    phone: null,
    email: null,
    side: null,
    relationship: null,
    groupName: null,
    maxPlusOne: 0,
    expectedCompanionCount: 0,
    notes: null,
    participantType,
  });
  const members = [row(2), row(3, "SPOUSE"), row(4, "CHILD"), row(5, "CHILD")];
  return previewSchema.parse({
    importId: "session",
    expiresAt: "2026-10-11T15:00:00+07:00",
    rows: [...members, row(6)],
    errors: [],
    warnings: [],
    formatVersion: 2,
    groups: [
      {
        groupKey: "GD01",
        code: "GD01",
        members,
        namedPersonCount: 4,
        additionalAllowance: 2,
        maximumPartySize: 6,
      },
      {
        groupKey: "ROW:6",
        code: null,
        members: [row(6)],
        namedPersonCount: 1,
        additionalAllowance: 0,
        maximumPartySize: 1,
      },
    ],
  });
}
test("one invalid child blocks the entire household; valid solo remains selectable", () => {
  const data = fixture();
  data.errors.push({ rowNumber: 4, column: "Họ và tên", code: "NAME", message: "Invalid name" });
  assert.deepEqual(
    importUnits(data).map((unit) => unit.valid),
    [false, true],
  );
  assert.deepEqual(confirmation(data, ["GD01", "ROW:6", "ROW:6", "unknown"], false), {
    importId: "session",
    groupKeys: ["ROW:6"],
    acknowledgeDuplicates: false,
  });
});
test("v2 confirms household keys, retaining allowance separately from named people", () => {
  const data = fixture();
  const [unit] = importUnits(data);
  assert.ok(unit);
  assert.equal(unit.members.length, 4);
  assert.equal(unit.allowance, 2);
  assert.deepEqual(confirmation(data, ["GD01"], true), {
    importId: "session",
    groupKeys: ["GD01"],
    acknowledgeDuplicates: true,
  });
});
test("legacy preview sends rowNumbers and supports nullable metadata", () => {
  const data = fixture();
  data.formatVersion = 1;
  data.groups = null;
  assert.deepEqual(confirmation(data, ["2", "3"], false), {
    importId: "session",
    rowNumbers: [2, 3],
    acknowledgeDuplicates: false,
  });
  assert.equal(data.rows[0]?.side, null);
});
test("file limits reject empty, oversize and unsupported workbooks", () => {
  assert.equal(validateFile({ name: "family.XLSX", size: 5 * 1024 * 1024 }), null);
  for (const file of [
    { name: "family.xlsm", size: 1 },
    { name: "family.csv", size: 0 },
    { name: "family.xlsx", size: 5 * 1024 * 1024 + 1 },
  ])
    assert.ok(validateFile(file));
});
test("authenticated upload uses multipart, confirm retry sends identical selection, list uses backend filters", async () => {
  const original = globalThis.fetch;
  const session = new Session({
    refreshEnabled: false,
    refresh: async () => ({ accessToken: "test", expiresIn: 3600 }),
    onClear: () => undefined,
  });
  session.accept({ accessToken: "test", expiresIn: 3600 });
  const api = createApiClient("http://localhost/api", session);
  const bodies: unknown[] = [];
  globalThis.fetch = async (url, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer test");
    if (String(url).endsWith("/preview")) {
      assert.ok(init?.body instanceof FormData);
      assert.equal(headers.get("Content-Type"), null);
      assert.equal((init.body.get("file") as File).name, "family.xlsx");
      assert.equal(init.body.get("replacesImportId"), "previous-session");
      return Response.json(fixture());
    }
    if (String(url).endsWith("/confirm")) {
      bodies.push(JSON.parse(String(init?.body)));
      return Response.json({
        importId: "session",
        importedCount: 1,
        guestIds: ["g1"],
        importedParticipantCount: 4,
      });
    }
    const parsed = new URL(String(url));
    assert.equal(parsed.searchParams.get("page"), "2");
    assert.equal(parsed.searchParams.get("search"), "An & Bình");
    assert.equal(parsed.searchParams.get("withoutInvitation"), "true");
    return Response.json({ items: [], totalCount: 0, page: 2, pageSize: 20 });
  };
  try {
    const data = await previewFile(
      api,
      "wedding",
      new File(["test"], "family.xlsx"),
      "previous-session",
    );
    const body = confirmation(data, ["GD01"], false);
    const first = await confirmFile(api, "wedding", body);
    await confirmFile(api, "wedding", body);
    assert.equal(first.importedParticipantCount, 4);
    assert.deepEqual(bodies, [body, body]);
    await getGuests(api, "wedding", {
      page: 2,
      search: "An & Bình",
      recordStatus: "ACTIVE",
      sort: "fullName:asc",
      withoutInvitation: true,
    });
  } finally {
    globalThis.fetch = original;
  }
});
