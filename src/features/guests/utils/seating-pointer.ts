// Keep one request in flight and only the newest pending position. Slow links cannot build a queue.
export function createLatestPointerSender<T>(send: (value: T) => Promise<unknown>, interval = 50) {
  let pending: T | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  function schedule() {
    if (!busy && pending !== undefined && timer === undefined)
      timer = setTimeout(() => {
        void flush();
      }, interval);
  }
  async function flush() {
    timer = undefined;
    if (pending === undefined || busy) return;
    const value = pending;
    pending = undefined;
    busy = true;
    try {
      await send(value);
    } catch {
      /* Pointer updates are disposable; lease renewal handles connectivity failures. */
    } finally {
      busy = false;
      schedule();
    }
  }
  return {
    push(value: T) {
      pending = value;
      schedule();
    },
    cancel() {
      pending = undefined;
      clearTimeout(timer);
      timer = undefined;
    },
  };
}

export type PointerPoint = { x: number; y: number };
export function readSeatingPointer(point: PointerPoint) {
  const anchor = document
    .elementFromPoint(point.x, point.y)
    ?.closest<HTMLElement>("[data-seating-pointer-anchor]");
  if (!anchor) return null;
  const anchorName = anchor.dataset.seatingPointerAnchor;
  if (!anchorName) return null;
  const rect = anchor.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    anchor: anchorName,
    x: Math.max(0, Math.min(1, (point.x - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (point.y - rect.top) / rect.height)),
  };
}
