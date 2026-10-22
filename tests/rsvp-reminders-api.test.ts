import assert from "node:assert/strict";
import test from "node:test";
import type { ApiClient } from "../src/core/api/api-client";
import {
  getRsvpReminderSummary,
  listRsvpReminders,
  previewRsvpReminders,
  saveRsvpReminderSettings,
  sendRsvpReminders,
} from "../src/features/rsvp/api/rsvp-reminders.api";

function fakeApi() {
  const requests: { path: string; options: Record<string, unknown> }[] = [];
  const api = {
    request: async (path: string, options: Record<string, unknown>) => {
      requests.push({ path, options });
      return {};
    },
  } as unknown as ApiClient;
  return { api, requests };
}

test("loads the wedding-scoped RSVP reminder summary", async () => {
  const { api, requests } = fakeApi();

  await getRsvpReminderSummary(api, "wedding/1");

  assert.equal(requests[0]?.path, "/weddings/wedding%2F1/rsvps/reminders/summary");
});

test("saves automatic reminder settings with the API contract", async () => {
  const { api, requests } = fakeApi();

  await saveRsvpReminderSettings(api, "wedding-1", false);

  assert.equal(requests[0]?.path, "/weddings/wedding-1/rsvps/reminders/settings");
  assert.equal(requests[0]?.options.method, "PUT");
  assert.deepEqual(requests[0]?.options.body, { autoEnabled: false });
});

test("previews and queues manual reminders for the selected guests", async () => {
  const { api, requests } = fakeApi();

  await previewRsvpReminders(api, "wedding-1");
  await sendRsvpReminders(api, "wedding-1", ["guest-1", "guest-2"]);

  assert.equal(requests[0]?.path, "/weddings/wedding-1/rsvps/reminders/preview");
  assert.equal(requests[1]?.path, "/weddings/wedding-1/rsvps/reminders/send");
  assert.deepEqual(requests[1]?.options.body, { guestIds: ["guest-1", "guest-2"] });
});

test("filters reminder history with status, kind, and pagination", async () => {
  const { api, requests } = fakeApi();

  await listRsvpReminders(api, "wedding-1", {
    status: "FAILED",
    kind: "MANUAL",
    page: 2,
    pageSize: 25,
  });

  assert.equal(
    requests[0]?.path,
    "/weddings/wedding-1/rsvps/reminders?status=FAILED&kind=MANUAL&page=2&pageSize=25",
  );
});
