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

test("pointer targets update immediately, ignore older samples and survive an older target in a newer snapshot", () => {
  const store = createSeatingCollaborationStore("w");
  const lease = {
    userId: "u",
    connectionId: "c",
    dragId: "d",
    displayName: "An",
    placeIds: ["p"],
    expiresAt: "2026-10-20T10:00:00Z",
    tableId: null,
    seatNumber: null,
    targetSequence: 0,
  };
  store.getState().replace({ weddingId: "w", revision: 1, leases: [lease] });
  const packet = {
    weddingId: "w",
    connectionId: "c",
    dragId: "d",
    anchor: "board",
    x: 0.5,
    y: 0.5,
    sequence: 10,
    hasTarget: true,
    tableId: "table",
    seatNumber: 2,
  };
  store.getState().updateTarget(packet);
  assert.equal(store.getState().leases[0]?.seatNumber, 2);
  const unchanged = store.getState();
  store.getState().updateTarget({ ...packet, sequence: 11 });
  assert.equal(
    store.getState(),
    unchanged,
    "unchanged targets must not rerender the board on every pointer",
  );
  store.getState().replace({ weddingId: "w", revision: 2, leases: [lease] });
  assert.equal(store.getState().leases[0]?.seatNumber, 2);
  for (const invalid of [
    { ...packet, sequence: 9, seatNumber: 1 },
    { ...packet, sequence: 12, weddingId: "other", seatNumber: 1 },
    { ...packet, sequence: 12, connectionId: "other", seatNumber: 1 },
  ])
    store.getState().updateTarget(invalid);
  assert.equal(store.getState().leases[0]?.seatNumber, 2);
  store.getState().updateTarget({ ...packet, sequence: 12, tableId: null, seatNumber: null });
  assert.equal(store.getState().leases[0]?.tableId, null);
  store.getState().replace({ weddingId: "w", revision: 3, leases: [] });
  store.getState().updateTarget({ ...packet, sequence: 13 });
  assert.equal(
    store.getState().leases.length,
    0,
    "pointer packets cannot resurrect a released lease",
  );
});
