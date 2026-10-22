import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { authApi } from "../src/features/auth/api/auth.api";
import { createApiClient } from "../src/core/api/api-client";
import { SessionManager } from "../src/core/auth/session-manager";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  profileSchema,
  resetPasswordSchema,
} from "../src/features/auth/schemas/account-management.schema";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("account recovery schemas validate email, strong password, and matching confirmation", () => {
  assert.equal(forgotPasswordSchema.safeParse({ email: " not-an-email " }).success, false);
  assert.equal(
    forgotPasswordSchema.parse({ email: " person@example.com " }).email,
    "person@example.com",
  );

  const validPassword = "LongEnoughPass123!";
  assert.equal(
    resetPasswordSchema.safeParse({ newPassword: validPassword, confirmPassword: "different" })
      .success,
    false,
  );
  assert.equal(
    resetPasswordSchema.safeParse({ newPassword: validPassword, confirmPassword: validPassword })
      .success,
    true,
  );
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: validPassword,
      newPassword: validPassword,
      confirmPassword: validPassword,
    }).success,
    false,
  );
});

test("profile schema follows backend name, Vietnamese phone, and HTTP(S) avatar rules", () => {
  assert.equal(
    profileSchema.safeParse({ displayName: "  ", phone: "", avatarUrl: "" }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({
      displayName: "An",
      phone: "0912345678",
      avatarUrl: "https://cdn.example/avatar.png",
    }).success,
    true,
  );
  assert.equal(
    profileSchema.safeParse({
      displayName: "An",
      phone: "1234567890",
      avatarUrl: "javascript:alert(1)",
    }).success,
    false,
  );
});

test("public password reset requests use anonymous endpoints and include credentials only to clear the reset cookie", async () => {
  const calls: Array<{
    url: string;
    method?: string;
    credentials?: RequestCredentials;
    body: unknown;
    authorization: string | null;
  }> = [];
  globalThis.fetch = async (url, init) => {
    calls.push({
      url: String(url),
      method: init?.method,
      credentials: init?.credentials,
      body: init?.body ? JSON.parse(String(init.body)) : null,
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(null, { status: String(url).endsWith("forgot-password") ? 202 : 204 });
  };

  const api = createApiClient("https://api.example.test/api");
  await authApi.forgotPassword(api, "person@example.com");
  await authApi.resetPassword(api, {
    email: "person@example.com",
    code: "encoded+/reset=token",
    newPassword: "NewStrongPassword123!",
  });

  assert.deepEqual(calls, [
    {
      url: "https://api.example.test/api/auth/forgot-password",
      method: "POST",
      credentials: "omit",
      body: { email: "person@example.com" },
      authorization: null,
    },
    {
      url: "https://api.example.test/api/auth/reset-password",
      method: "POST",
      credentials: "include",
      body: {
        email: "person@example.com",
        code: "encoded+/reset=token",
        newPassword: "NewStrongPassword123!",
      },
      authorization: null,
    },
  ]);
});

test("profile, change-password, and delete calls require Bearer auth and send credentials for cookie revocation", async () => {
  const session = new SessionManager();
  session.setToken({ accessToken: "account-session-token", expiresIn: 900 });
  const api = createApiClient("https://api.example.test/api", session);
  const calls: Array<{
    url: string;
    method?: string;
    credentials?: RequestCredentials;
    body: unknown;
    authorization: string | null;
  }> = [];
  globalThis.fetch = async (url, init) => {
    calls.push({
      url: String(url),
      method: init?.method,
      credentials: init?.credentials,
      body: init?.body ? JSON.parse(String(init.body)) : null,
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    if (String(url).endsWith("/auth/me")) {
      return Response.json({
        id: "account-id",
        displayName: "An",
        email: "person@example.com",
        role: "USER",
        emailConfirmed: true,
        phone: "0912345678",
        avatarUrl: "https://cdn.example/avatar.png",
      });
    }
    return new Response(null, { status: 204 });
  };

  const updated = await authApi.updateProfile(api, {
    displayName: "An",
    phone: "0912345678",
    avatarUrl: "https://cdn.example/avatar.png",
  });
  await authApi.changePassword(api, {
    currentPassword: "CurrentPassword123!",
    newPassword: "NewPassword123!",
  });
  await authApi.deleteAccount(api, { password: "CurrentPassword123!" });

  assert.equal(updated.phone, "0912345678");
  assert.deepEqual(
    calls.map(({ url, method, credentials, body, authorization }) => ({
      url: url.replace("https://api.example.test/api", ""),
      method,
      credentials,
      body,
      authorization,
    })),
    [
      {
        url: "/auth/me",
        method: "PUT",
        credentials: "omit",
        body: {
          displayName: "An",
          phone: "0912345678",
          avatarUrl: "https://cdn.example/avatar.png",
        },
        authorization: "Bearer account-session-token",
      },
      {
        url: "/auth/change-password",
        method: "POST",
        credentials: "include",
        body: { currentPassword: "CurrentPassword123!", newPassword: "NewPassword123!" },
        authorization: "Bearer account-session-token",
      },
      {
        url: "/auth/account",
        method: "DELETE",
        credentials: "include",
        body: { password: "CurrentPassword123!" },
        authorization: "Bearer account-session-token",
      },
    ],
  );
});
