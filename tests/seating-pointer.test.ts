import { test } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as flush } from "node:timers/promises";
import { createLatestPointerSender } from "../src/features/guests/utils/seating-pointer";
import { seatingDragPointerSchema } from "../src/core/realtime/seating-drag-events";

test("pointer movement keeps only the latest point, with one in-flight request even on a slow link", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let finish!: () => void;
  const blocked = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const sent: number[] = [];
  const sender = createLatestPointerSender<number>(async (point) => {
    sent.push(point);
    if (sent.length === 1) await blocked;
  });
  sender.push(1);
  sender.push(2);
  sender.push(3);
  t.mock.timers.tick(49);
  assert.deepEqual(sent, []);
  t.mock.timers.tick(1);
  assert.deepEqual(sent, [3]);
  for (let i = 4; i <= 100; i++) sender.push(i);
  t.mock.timers.tick(5000);
  assert.deepEqual(sent, [3]);
  finish();
  await flush();
  t.mock.timers.tick(50);
  await flush();
  assert.deepEqual(sent, [3, 100]);
  sender.push(101);
  sender.cancel();
  t.mock.timers.tick(50);
  await flush();
  assert.deepEqual(sent, [3, 100]);
});

test("pointer payload rejects invalid coordinates and unexpected anchors", () => {
  const packet = {
    weddingId: "w",
    connectionId: "c",
    dragId: "g",
    anchor: "board",
    x: 0.25,
    y: 0.75,
    sequence: 1,
  };
  assert.equal(seatingDragPointerSchema.safeParse(packet).success, true);
  for (const x of [-1, 2, NaN, Infinity])
    assert.equal(seatingDragPointerSchema.safeParse({ ...packet, x }).success, false);
  assert.equal(
    seatingDragPointerSchema.safeParse({ ...packet, anchor: "other-page" }).success,
    false,
  );
});
