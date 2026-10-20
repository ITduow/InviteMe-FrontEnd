// One transport write in flight and one latest pending position. send() must not wait for a hub response.
export function createLatestPointerSender<T>(send: (value: T) => Promise<unknown>, interval = 34) {
  let pending: T | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  let sending: Promise<unknown> | undefined;
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
      sending = send(value);
      await sending;
    } catch {
      /* Pointer updates are disposable; lease renewal handles connectivity failures. */
    } finally {
      busy = false;
      sending = undefined;
      schedule();
    }
  }
  return {
    push(value: T) {
      pending = value;
      schedule();
    },
    async flush() {
      // A drop flushes the last sample before the HTTP mutation and EndSeatingDrag.
      // The caller stops accepting movement before awaiting this method.
      if (sending) await sending.catch(() => undefined);
      clearTimeout(timer);
      timer = undefined;
      await flush();
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
