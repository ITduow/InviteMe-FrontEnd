import assert from "node:assert/strict";
import test from "node:test";
import { weddingAccessSchema } from "../src/core/auth/auth.types";
import { isWeddingWidePermission } from "../src/core/auth/wedding-access";

test("wedding access contract includes named permission scopes", () => {
  const access = weddingAccessSchema.parse({
    weddingId: "wedding-1",
    isOwner: false,
    permissions: ["WEDDING_VIEW", "SEATING_EDIT", "CHECKIN_MANAGE"],
    scopes: [
      { permission: "WEDDING_VIEW", weddingWide: true, groups: [] },
      {
        permission: "SEATING_EDIT",
        weddingWide: false,
        groups: [{ id: "group-1", name: "Bạn bè" }],
      },
      { permission: "CHECKIN_MANAGE", weddingWide: true, groups: [] },
    ],
  });

  assert.equal(isWeddingWidePermission(access, "WEDDING_VIEW"), true);
  assert.equal(isWeddingWidePermission(access, "SEATING_EDIT"), false);
  assert.equal(isWeddingWidePermission(access, "CHECKIN_MANAGE"), true);
  assert.equal(
    access.scopes?.find((scope) => scope.permission === "SEATING_EDIT")?.groups[0]?.name,
    "Bạn bè",
  );
});

test("missing scope data never upgrades a co-host grant to wedding-wide", () => {
  const access = weddingAccessSchema.parse({
    weddingId: "wedding-1",
    isOwner: false,
    permissions: ["SEATING_EDIT"],
  });

  assert.equal(isWeddingWidePermission(access, "SEATING_EDIT"), false);
});
