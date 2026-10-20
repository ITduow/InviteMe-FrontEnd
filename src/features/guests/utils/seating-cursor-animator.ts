import { PerfectCursor } from "perfect-cursors";
import type { SeatingDragPointer } from "../../../core/realtime/seating-drag-events";

// Interpolate in a stable pixel-sized anchor space. Resolve geometry at paint time so
// receiver scrolling, resizing and table layout changes do not invalidate old samples.
export function createSeatingCursorAnimator(element: HTMLDivElement) {
  let cursor: PerfectCursor | undefined;
  let pointer: SeatingDragPointer | undefined;
  let basis = { width: 1, height: 1 };
  let point: [number, number] = [0, 0];
  let screen: [number, number] | undefined;
  let anchor: HTMLElement | null = null;
  let frame: number;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  function disposeCursor() {
    if (!cursor) return;
    cancelAnimationFrame(cursor.lastRequestId);
    cursor.dispose();
    cursor = undefined;
  }
  function paint() {
    if (pointer) {
      if (!anchor?.isConnected)
        anchor = document.querySelector<HTMLElement>(
          `[data-seating-pointer-anchor="${pointer.anchor}"]`,
        );
      const rect = anchor?.getBoundingClientRect();
      element.hidden = !rect || rect.width <= 0 || rect.height <= 0;
      if (rect && !element.hidden) {
        const rawX = rect.left + (point[0] / basis.width) * rect.width;
        const rawY = rect.top + (point[1] / basis.height) * rect.height;
        screen = [rawX, rawY];
        const x = Math.max(12, Math.min(innerWidth - 12, rawX));
        const y = Math.max(12, Math.min(innerHeight - 12, rawY));
        element.dataset.offscreen = String(
          rawX < 0 || rawY < 0 || rawX > innerWidth || rawY > innerHeight,
        );
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        element.style.setProperty("--chip-x", x > innerWidth - 260 ? "-245px" : "14px");
        element.style.setProperty("--chip-y", y > innerHeight - 200 ? "-190px" : "12px");
      }
    }
    frame = requestAnimationFrame(paint);
  }
  frame = requestAnimationFrame(paint);
  return {
    push(next: SeatingDragPointer) {
      if (pointer?.dragId === next.dragId && pointer.sequence >= next.sequence) return;
      const changedAnchor = pointer?.anchor !== next.anchor;
      pointer = next;
      if (changedAnchor || !cursor) {
        disposeCursor();
        anchor = document.querySelector<HTMLElement>(
          `[data-seating-pointer-anchor="${next.anchor}"]`,
        );
        const rect = anchor?.getBoundingClientRect();
        basis = { width: rect?.width || 1, height: rect?.height || 1 };
        point =
          screen && rect
            ? [screen[0] - rect.left, screen[1] - rect.top]
            : [next.x * basis.width, next.y * basis.height];
        cursor = new PerfectCursor((value) => {
          point = [value[0] ?? 0, value[1] ?? 0];
        });
        cursor.addPoint(point);
      }
      const target: [number, number] = [next.x * basis.width, next.y * basis.height];
      if (reducedMotion.matches) {
        disposeCursor();
        point = target;
      } else cursor?.addPoint(target);
    },
    reset() {
      disposeCursor();
      pointer = undefined;
      screen = undefined;
      anchor = null;
      element.hidden = true;
    },
    dispose() {
      cancelAnimationFrame(frame);
      disposeCursor();
    },
  };
}
