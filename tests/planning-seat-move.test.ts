import test from "node:test";
import assert from "node:assert/strict";
import { previewSeatMove } from "../src/features/guests/utils/planning-seat-move";
import type { SeatingPlan } from "../src/features/guests/api/planning-seating.api";

function plan(): SeatingPlan {
  return {
    weddingId: "w",
    version: 3,
    guests: [],
    tables: [
      { id: "a", name: "A", capacity: 4 },
      { id: "b", name: "B", capacity: 2 },
    ],
    places: [1, 2, 3, 4].map((n) => ({ id: `p${n}`, guestId: "g", position: n, person: null })),
    assignments: [1, 2, 3, 4].map((n) => ({ placeId: `p${n}`, tableId: "a", seatNumber: n })),
  };
}
test("whole family moves atomically, oversized target never previews a partial move", () => {
  const original = plan();
  assert.equal(previewSeatMove(original, ["p1", "p2", "p3", "p4"], "b"), null);
  assert.equal(original.assignments.length, 4);
});
test("split one unnamed place preserves identity, expected total and existing seats", () => {
  const next = previewSeatMove(plan(), ["p3"], "b", 2);
  assert.equal(next?.assignments.find((x) => x.placeId === "p3")?.seatNumber, 2);
  assert.equal(next?.assignments.filter((x) => x.tableId === "a").length, 3);
  assert.equal(next?.places.length, 4);
  assert.equal(next?.version, 3);
});
test("occupied seat rejected; unassigning and reordering a full table supported", () => {
  assert.equal(previewSeatMove(plan(), ["p1"], "a", 2), null);
  assert.equal(
    previewSeatMove(plan(), ["p1", "p2", "p3", "p4"], "a", 3)?.assignments[0]?.seatNumber,
    3,
  );
  assert.equal(previewSeatMove(plan(), ["p1", "p2"], null)?.assignments.length, 2);
  assert.equal(previewSeatMove(plan(), ["p1", "p1"], "b"), null);
});
