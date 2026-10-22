import assert from "node:assert/strict";
import test from "node:test";
import type { ApiClient } from "../src/core/api/api-client";
import {
  addReceptionWalkIn,
  checkInGuestPlaces,
  searchReceptionGuests,
} from "../src/features/guests/api/seat-lookup.api";

test("reception search encodes the search text and uses the wedding-scoped endpoint", async () => {
  const requests: { path: string; options: Record<string, unknown> }[] = [];
  const api = {
    request: async (path: string, options: Record<string, unknown>) => {
      requests.push({ path, options });
      return [];
    },
  } as unknown as ApiClient;

  await searchReceptionGuests(api, "wedding-1", "  Nguyễn Văn Đức ");

  assert.equal(
    requests[0]?.path,
    "/weddings/wedding-1/guest-planning/reception/search?q=Nguy%E1%BB%85n+V%C4%83n+%C4%90%E1%BB%A9c",
  );
});

test("a found guest is checked in by guest ID and selected place IDs", async () => {
  const requests: { path: string; options: Record<string, unknown> }[] = [];
  const api = {
    request: async (path: string, options: Record<string, unknown>) => {
      requests.push({ path, options });
      return { guestId: "guest-1", recipientName: "Khách", honorific: null, places: [] };
    },
  } as unknown as ApiClient;

  await checkInGuestPlaces(api, "wedding-1", { guestId: "guest-1" }, ["place-1"]);

  assert.equal(requests[0]?.path, "/weddings/wedding-1/guest-planning/check-ins");
  assert.deepEqual(requests[0]?.options.body, {
    code: null,
    guestId: "guest-1",
    placeIds: ["place-1"],
  });
});

test("walk-ins send the server-required idempotency key with the new guest body", async () => {
  const requests: { path: string; options: Record<string, unknown> }[] = [];
  const api = {
    request: async (path: string, options: Record<string, unknown>) => {
      requests.push({ path, options });
      return {
        guestId: "guest-2",
        recipientName: "Khách vãng lai",
        honorific: null,
        newGuest: true,
        overCapacity: false,
        places: [],
      };
    },
  } as unknown as ApiClient;
  const key = "5d844f74-b6ea-41b1-999c-6f0752573bf8";

  await addReceptionWalkIn(
    api,
    "wedding-1",
    {
      guestId: null,
      recipientName: "Khách vãng lai",
      people: 1,
      side: "UNSPECIFIED",
    },
    key,
  );

  assert.equal(requests[0]?.path, "/weddings/wedding-1/guest-planning/walk-ins");
  assert.deepEqual(requests[0]?.options.headers, { "Idempotency-Key": key });
  assert.deepEqual(requests[0]?.options.body, {
    guestId: null,
    recipientName: "Khách vãng lai",
    people: 1,
    side: "UNSPECIFIED",
  });
});
