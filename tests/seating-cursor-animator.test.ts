import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeatingCursorAnimator } from "../src/features/guests/utils/seating-cursor-animator";

test("cursor interpolates without React and follows receiver layout; disposal cancels animation", (t) => {
  let now = 0;
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const original = new Map<string, PropertyDescriptor | undefined>();
  const install = (name: string, value: unknown) => {
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  let rect = { left: 100, top: 100, width: 400, height: 200 };
  const anchor = { isConnected: true, getBoundingClientRect: () => rect };
  install("document", { querySelector: () => anchor });
  install("innerWidth", 1200);
  install("innerHeight", 800);
  install("matchMedia", () => ({ matches: false }));
  install("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  install("cancelAnimationFrame", (key: number) => frames.delete(key));
  t.mock.method(performance, "now", () => now);
  function tick(time: number) {
    now = time;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
  }
  const element = {
    hidden: true,
    dataset: {},
    style: { transform: "", setProperty() {} },
  };
  const animator = createSeatingCursorAnimator(element as unknown as HTMLDivElement);
  const packet = {
    weddingId: "w",
    connectionId: "c",
    dragId: "d",
    anchor: "board",
    x: 0,
    y: 0,
    sequence: 1,
  };
  try {
    animator.push(packet);
    tick(16);
    assert.equal(element.style.transform, "translate3d(100px, 100px, 0)");
    animator.push({ ...packet, x: 0.001, sequence: 2 });
    tick(32);
    assert.equal(
      String(element.style.transform),
      "translate3d(100.4px, 100px, 0)",
      "small movements must not revert to the library's previous spline endpoint",
    );
    now = 100;
    animator.push({ ...packet, x: 1, sequence: 3 });
    tick(132);
    tick(148);
    const x = Number(element.style.transform.match(/\(([^p]+)px/)![1]);
    assert.ok(x > 100 && x < 500, `Expected an intermediate frame, got ${x}`);
    rect = { ...rect, left: 200, width: 800 };
    tick(164);
    const moved = Number(element.style.transform.match(/\(([^p]+)px/)![1]);
    assert.ok(moved > x, "receiver geometry must be resolved at paint time");
    for (let time = 180; time <= 400; time += 16) tick(time);
    assert.equal(
      element.style.transform,
      "translate3d(1000px, 100px, 0)",
      "stopped cursor must reach the exact last sample",
    );
    now = 410;
    animator.push({ ...packet, anchor: "queue", x: 0.2, sequence: 4 });
    tick(426);
    const crossing = Number(String(element.style.transform).match(/\(([^p]+)px/)![1]);
    assert.ok(crossing > 360, "switching anchors must continue from the visible point");
    animator.reset();
    assert.equal(element.hidden, true);
    animator.dispose();
    assert.equal(frames.size, 0);
  } finally {
    animator.dispose();
    for (const [name, descriptor] of original)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
  }
});
