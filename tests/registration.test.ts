import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { registerSchema } from "../src/features/auth/schemas/register.schema";
import { authApi } from "../src/features/auth/api/auth.api";
import { createApiClient } from "../src/core/api/api-client";
import { ApiError } from "../src/core/api/api-error";
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const valid = {
  displayName: " Nguyễn An ",
  email: " an@example.com ",
  password: "StrongPass123!",
  confirmPassword: "StrongPass123!",
};
test("registration normalizes names/email without changing passwords and rejects mismatches", () => {
  const result = registerSchema.parse(valid);
  assert.equal(result.displayName, "Nguyễn An");
  assert.equal(result.email, "an@example.com");
  assert.equal(result.password, valid.password);
  for (const password of [
    "short",
    "onlylowercase123!",
    "ONLYUPPERCASE123!",
    "NoDigitsHere!!",
    "NoSpecial12345",
  ]) {
    assert.equal(
      registerSchema.safeParse({ ...valid, password, confirmPassword: password }).success,
      false,
    );
  }
  assert.equal(registerSchema.safeParse({ ...valid, confirmPassword: "different" }).success, false);
  assert.equal(registerSchema.safeParse({ ...valid, displayName: "  " }).success, false);
  assert.equal(registerSchema.safeParse({ ...valid, email: "invalid" }).success, false);
});
test("register sends only backend fields, anonymously, and accepts the account rather than a session", async () => {
  const input = registerSchema.parse(valid);
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://api.example.test/api/auth/register");
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "omit");
    assert.equal(new Headers(init?.headers).get("Authorization"), null);
    assert.deepEqual(JSON.parse(String(init?.body)), {
      displayName: input.displayName,
      email: input.email,
      password: input.password,
    });
    return Response.json(
      {
        id: "user-id",
        displayName: input.displayName,
        email: input.email,
        role: "USER",
        emailConfirmed: false,
      },
      { status: 201 },
    );
  };
  const account = await authApi.register(createApiClient("https://api.example.test/api"), input);
  assert.equal(account.emailConfirmed, false);
  assert.equal("accessToken" in account, false);
});
test("confirmation preserves token characters and handles empty 204/202 responses", async () => {
  const calls: unknown[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push([String(url), JSON.parse(String(init?.body))]);
    return new Response(null, { status: String(url).endsWith("confirm-email") ? 204 : 202 });
  };
  const api = createApiClient("https://api.example.test/api");
  await authApi.confirmEmail(api, "an@example.com", "abc+/=%value");
  await authApi.resendConfirmation(api, "an@example.com");
  assert.deepEqual(calls, [
    [
      "https://api.example.test/api/auth/confirm-email",
      { email: "an@example.com", code: "abc+/=%value" },
    ],
    ["https://api.example.test/api/auth/resend-confirmation", { email: "an@example.com" }],
  ]);
});
test("duplicate account code is preserved without exposing backend details", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { code: "DUPLICATE_ACCOUNT", detail: "private database information" },
      { status: 409 },
    );
  await assert.rejects(
    authApi.register(createApiClient("https://api.example.test/api"), registerSchema.parse(valid)),
    (error: unknown) =>
      error instanceof ApiError &&
      error.backendCode === "DUPLICATE_ACCOUNT" &&
      !error.message.includes("private"),
  );
});
