import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeatingCollaborationStore } from "../src/features/guests/stores/seating-collaboration";

test("snapshots replace locks, reject other weddings and out-of-order updates; reconnect resets revision", () => {
  const store = createSeatingCollaborationStore("one");
  const lease = {
    userId: "user",
    connectionId: "tab",
    dragId: "gesture",
    displayName: "An",
    placeIds: ["p"],
    expiresAt: "2026-10-20T10:00:00Z",
    tableId: null,
    seatNumber: null,
  };
  store.getState().replace({ weddingId: "one", revision: 10, leases: [lease] });
  store.getState().replace({ weddingId: "one", revision: 9, leases: [] });
  store.getState().replace({ weddingId: "other", revision: 11, leases: [] });
  assert.equal(store.getState().leases.length, 1);
  store.getState().replace({ weddingId: "one", revision: 11, leases: [] });
  assert.equal(store.getState().leases.length, 0);
  store.getState().reset();
  store.getState().replace({ weddingId: "one", revision: 1, leases: [lease] });
  assert.equal(store.getState().leases.length, 1);
});
