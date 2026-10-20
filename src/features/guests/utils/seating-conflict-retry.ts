import { ApiError } from "@/core/api/api-error";
import type { ApiClient } from "@/core/api/api-client";
import {
  changeSeatingPlan,
  getSeatingPlan,
  type SeatingChange,
  type SeatingPlan,
} from "../api/planning-seating.api";
import { previewSeatMove } from "./planning-seat-move";

type Move = Extract<SeatingChange, { action: "MOVE_PLACES" }>;

export function canRetrySeatingMove(source: SeatingPlan, latest: SeatingPlan, move: Move) {
  if (source.weddingId !== latest.weddingId) return false;
  const unchanged = move.placeIds.every((id) => {
    const before = source.places.find((place) => place.id === id);
    const after = latest.places.find((place) => place.id === id);
    if (!before || !after || JSON.stringify(before) !== JSON.stringify(after)) return false;
    const guestBefore = source.guests.find((guest) => guest.id === before.guestId);
    const guestAfter = latest.guests.find((guest) => guest.id === after.guestId);
    if (!guestBefore || !guestAfter || guestBefore.version !== guestAfter.version) return false;
    const oldSeat = source.assignments.find((assignment) => assignment.placeId === id);
    const newSeat = latest.assignments.find((assignment) => assignment.placeId === id);
    return oldSeat?.tableId === newSeat?.tableId && oldSeat?.seatNumber === newSeat?.seatNumber;
  });
  return unchanged && !!previewSeatMove(latest, move.placeIds, move.tableId, move.seatNumber);
}

// Retry only a version conflict, once, after checking the source and validating lease ownership.
export async function moveSeatingWithRetry(
  api: ApiClient,
  weddingId: string,
  source: SeatingPlan,
  move: Move,
  token: string,
  renewLease: () => Promise<unknown>,
) {
  try {
    return await changeSeatingPlan(api, weddingId, source.version, move, token);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 409 ||
      error.backendCode !== "CONCURRENCY_CONFLICT"
    )
      throw error;
    const latest = await getSeatingPlan(api, weddingId);
    if (!canRetrySeatingMove(source, latest, move)) throw error;
    await renewLease();
    return changeSeatingPlan(api, weddingId, latest.version, move, token);
  }
}
