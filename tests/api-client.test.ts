import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createApiClient } from "../src/core/api/api-client";
import { ApiError, normalizeHttpError } from "../src/core/api/api-error";
import { Session } from "../src/core/auth/session";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const tokens = { accessToken: "host-token", expiresIn: 3600 };
function session(refreshEnabled = false) {
  const result = new Session({
    refreshEnabled,
    refresh: async () => ({ ...tokens, accessToken: "new-token" }),
    onClear: () => undefined,
  });
  result.accept(tokens);
  return result;
}
test("anonymous invitation requests never attach a host JWT or cookies", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(new Headers(options?.headers).get("Authorization"), null);
    assert.equal(options?.credentials, "omit");
    return Response.json({ ok: true });
  };
  const api = createApiClient("https://api.example.test/api", session());
  assert.deepEqual(
    await api.request("/invitations/secret", {
      auth: "none",
      schema: z.object({ ok: z.boolean() }),
    }),
    { ok: true },
  );
});
test("401 refresh retries once with the new JWT", async () => {
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    assert.equal(
      new Headers(options?.headers).get("Authorization"),
      calls === 1 ? "Bearer host-token" : "Bearer new-token",
    );
    return calls === 1 ? new Response(null, { status: 401 }) : Response.json({ ok: true });
  };
  await createApiClient("https://api.example.test", session(true)).request("/test", {
    schema: z.object({ ok: z.boolean() }),
  });
  assert.equal(calls, 2);
});
test("409 remains a conflict and cannot expose backend exception details", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { detail: "SQL password=secret", title: "Database stack trace" },
      { status: 409 },
    );
  await assert.rejects(
    createApiClient("https://api.example.test").request("/test", {
      auth: "none",
      schema: z.unknown(),
    }),
    (error: unknown) =>
      error instanceof ApiError && error.code === "conflict" && !error.message.includes("secret"),
  );
});
test("field errors expose safe validation text only", () => {
  const error = normalizeHttpError(400, {
    errors: { Email: ["sensitive internal validation text"] },
  });
  assert.deepEqual(error.fieldErrors, { Email: ["Please check this value."] });
});
test("cancellation is preserved instead of normalized to a network error", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };
  await assert.rejects(
    createApiClient("https://api.example.test").request("/test", {
      auth: "none",
      schema: z.unknown(),
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );
  assert.equal(called, false);
});
test("a successful response from a previous session is discarded", async () => {
  const auth = session();
  globalThis.fetch = async () => {
    auth.clear();
    return Response.json({ privateData: true });
  };
  await assert.rejects(
    createApiClient("https://api.example.test", auth).request("/test", { schema: z.unknown() }),
    { name: "AbortError" },
  );
});
test("malformed successful payloads become a safe contract error", async () => {
  globalThis.fetch = async () => Response.json({ unexpected: true });
  await assert.rejects(
    createApiClient("https://api.example.test").request("/test", {
      auth: "none",
      schema: z.object({ id: z.string() }),
    }),
    (error: unknown) => error instanceof ApiError && error.code === "invalid-response",
  );
});
