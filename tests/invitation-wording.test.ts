import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../src/core/api/api-client";
import { SessionManager } from "../src/core/auth/session-manager";
import {
  wordingApi,
  wordingPresetsSchema,
  type WordingPreset,
} from "../src/features/guests/api/wording.api";

const weddingId = "10000000-0000-4000-8000-000000000001";
const guestId = "10000000-0000-4000-8000-000000000002";
const defaults: WordingPreset[] = [
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Mặc định",
    content: "Trân trọng mời {{recipientLabel}}.",
    senderPronoun: "",
    isDefault: true,
    honorifics: [],
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    name: "Trang trọng",
    content: "Kính mời {{recipientLabel}} chung vui cùng {{senderPronoun}}.",
    senderPronoun: "chúng cháu",
    isDefault: false,
    honorifics: ["Bác", "Cô", "Chú"],
  },
];
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
function api() {
  const session = new SessionManager();
  session.setToken({ accessToken: "test-access", expiresIn: 3600 });
  return createApiClient("https://api.test/api", session);
}

test("one preset accepts many honorifics and a default remains available", () => {
  assert.equal(wordingPresetsSchema.safeParse(defaults).success, true);
  const many = [
    ...defaults,
    {
      ...defaults[1]!,
      id: "10000000-0000-4000-8000-000000000005",
      name: "Anh chị",
      honorifics: ["Anh", "Chị"],
      senderPronoun: "chúng em",
    },
  ];
  assert.equal(wordingPresetsSchema.safeParse(many).success, true);
});
test("honorifics cannot be assigned twice, including Unicode, case and whitespace variants", () => {
  const presets = structuredClone(defaults);
  presets[0]!.honorifics = [" BÁC "];
  assert.equal(wordingPresetsSchema.safeParse(presets).success, false);
  presets[0]!.honorifics = [];
  presets[1]!.honorifics = ["Cô", " cô "];
  assert.equal(wordingPresetsSchema.safeParse(presets).success, false);
});
test("exactly one default is required", () => {
  assert.equal(
    wordingPresetsSchema.safeParse(defaults.map((p) => ({ ...p, isDefault: false }))).success,
    false,
  );
  assert.equal(
    wordingPresetsSchema.safeParse(defaults.map((p) => ({ ...p, isDefault: true }))).success,
    false,
  );
});
test("wording validates recipient placeholders, supported variables and required self-address", () => {
  for (const content of [
    "Hello",
    "{{email}}",
    "{{{recipientLabel}}}",
    "{{recipientLabel}",
    "{{recipientName}} {{unknown}}",
    "a".repeat(2001),
  ])
    assert.equal(wordingPresetsSchema.safeParse([{ ...defaults[0], content }]).success, false);
  assert.equal(
    wordingPresetsSchema.safeParse([{ ...defaults[0], content: "{{recipientName}} {{honorific}}" }])
      .success,
    true,
  );
  assert.equal(
    wordingPresetsSchema.safeParse([
      { ...defaults[0], content: "{{recipientLabel}} {{senderPronoun}}" },
    ]).success,
    false,
  );
});
test("save sends the complete versioned configuration under authentication", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), `https://api.test/api/weddings/${weddingId}/invitation-wording`);
    assert.equal(init?.method, "PUT");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-access");
    assert.deepEqual(JSON.parse(String(init?.body)), { expectedVersion: 3, presets: defaults });
    return Response.json({ weddingId, version: 4, presets: defaults });
  };
  assert.equal((await wordingApi.save(api(), weddingId, 3, defaults)).version, 4);
});
test("draft preview posts selected guest and unsaved presets without exposing tokens", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(
      String(url),
      `https://api.test/api/weddings/${weddingId}/invitation-wording/preview`,
    );
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { guestId, presets: defaults });
    return Response.json({
      guestId,
      presetId: defaults[1]!.id,
      presetName: "Trang trọng",
      usedDefault: false,
      recipientName: "An",
      honorific: "Bác",
      recipientLabel: "gia đình bác An",
      senderPronoun: "chúng cháu",
      content: "Kính mời gia đình bác An chung vui cùng chúng cháu.",
    });
  };
  const result = await wordingApi.preview(api(), weddingId, { guestId, presets: defaults });
  assert.equal(result.content, "Kính mời gia đình bác An chung vui cùng chúng cháu.");
  assert.equal("invitationToken" in result, false);
});
test("save conflicts stay actionable rather than silently overwriting settings", async () => {
  globalThis.fetch = async () => Response.json({ code: "CONCURRENCY_CONFLICT" }, { status: 409 });
  await assert.rejects(wordingApi.save(api(), weddingId, 0, defaults), {
    status: 409,
    backendCode: "CONCURRENCY_CONFLICT",
  });
});
