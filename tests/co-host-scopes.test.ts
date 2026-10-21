import { test } from "node:test";
import assert from "node:assert/strict";
import {
  grantsFromScopeDraft,
  scopeDraftFromGrants,
  scopeValidationMessage,
} from "../src/features/co-hosts/utils/scopes";
import type { PermissionScope } from "../src/features/co-hosts/api/co-host.api";

test("permission grants round-trip wedding-wide and selected guest-group scopes", () => {
  const grants: PermissionScope[] = [
    { permission: "GUEST_VIEW", weddingWide: false, groupIds: ["group-a", "group-b"] },
    { permission: "CHECKIN_MANAGE", weddingWide: true, groupIds: [] },
  ];

  assert.deepEqual(grantsFromScopeDraft(scopeDraftFromGrants(grants)), grants);
});

test("wedding-wide grants never send stale group IDs", () => {
  const draft = scopeDraftFromGrants([
    { permission: "SEATING_VIEW", weddingWide: true, groupIds: ["stale-group"] },
  ]);

  assert.deepEqual(grantsFromScopeDraft(draft), [
    { permission: "SEATING_VIEW", weddingWide: true, groupIds: [] },
  ]);
});

test("check-in cannot be assigned to guest groups", () => {
  assert.equal(
    scopeValidationMessage([
      { permission: "CHECKIN_MANAGE", weddingWide: false, groupIds: ["group-a"] },
    ]),
    "Quyền check-in chỉ được cấp cho toàn bộ wedding. Hãy xác nhận phạm vi này.",
  );
  assert.equal(
    scopeValidationMessage([{ permission: "CHECKIN_MANAGE", weddingWide: true, groupIds: [] }]),
    "",
  );
});

test("seating edit automatically includes view permission for the same scope", () => {
  const draft = scopeDraftFromGrants([
    { permission: "SEATING_EDIT", weddingWide: false, groupIds: ["group-a"] },
  ]);

  assert.deepEqual(grantsFromScopeDraft(draft), [
    { permission: "SEATING_VIEW", weddingWide: false, groupIds: ["group-a"] },
    { permission: "SEATING_EDIT", weddingWide: false, groupIds: ["group-a"] },
  ]);
  assert.equal(scopeValidationMessage(grantsFromScopeDraft(draft)), "");
});

test("seating edit scope must be covered by its view scope", () => {
  assert.match(
    scopeValidationMessage([
      { permission: "SEATING_VIEW", weddingWide: false, groupIds: ["group-a"] },
      { permission: "SEATING_EDIT", weddingWide: false, groupIds: ["group-b"] },
    ]),
    /cần quyền xem sơ đồ/,
  );
});
