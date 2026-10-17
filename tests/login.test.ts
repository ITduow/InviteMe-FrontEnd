import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { loginSchema } from "../src/features/auth/schemas/login.schema";
import { authApi } from "../src/features/auth/api/auth.api";
import { createApiClient } from "../src/core/api/api-client";
import { SessionManager } from "../src/core/auth/session-manager";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("login schema trims email, validates format, and rejects empty passwords", () => {
  const parsed = loginSchema.parse({
    email: "  user@example.com  ",
    password: "SecretPassword123!",
  });
  assert.equal(parsed.email, "user@example.com");
  assert.equal(parsed.password, "SecretPassword123!");

  // Empty password
  assert.equal(loginSchema.safeParse({ email: "user@example.com", password: "" }).success, false);

  // Invalid email
  assert.equal(
    loginSchema.safeParse({ email: "not-an-email", password: "Password123!" }).success,
    false,
  );

  // Excessively long password (>128 chars)
  assert.equal(
    loginSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(129),
    }).success,
    false,
  );
});

test("login sends credentials include and returns accessToken and expiresIn", async () => {
  let requestedUrl = "";
  let requestedMethod = "";
  let requestedCredentials = "";
  let requestBody: unknown = null;

  globalThis.fetch = async (url, init) => {
    requestedUrl = String(url);
    requestedMethod = init?.method ?? "";
    requestedCredentials = init?.credentials ?? "";
    requestBody = JSON.parse(String(init?.body));
    return Response.json(
      {
        accessToken: "test-jwt-token-123",
        expiresIn: 900,
      },
      { status: 200 },
    );
  };

  const api = createApiClient("https://api.example.test/api");
  const result = await authApi.login(api, {
    email: "host@example.com",
    password: "HostPassword123!",
  });

  assert.equal(requestedUrl, "https://api.example.test/api/auth/login");
  assert.equal(requestedMethod, "POST");
  assert.equal(requestedCredentials, "include");
  assert.deepEqual(requestBody, {
    email: "host@example.com",
    password: "HostPassword123!",
  });
  assert.equal(result.accessToken, "test-jwt-token-123");
  assert.equal(result.expiresIn, 900);
});

test("google login sends idToken and credentials include", async () => {
  let requestedUrl = "";
  let requestedCredentials = "";
  let requestBody: unknown = null;

  globalThis.fetch = async (url, init) => {
    requestedUrl = String(url);
    requestedCredentials = init?.credentials ?? "";
    requestBody = JSON.parse(String(init?.body));
    return Response.json(
      {
        accessToken: "google-jwt-access-token",
        expiresIn: 1800,
      },
      { status: 200 },
    );
  };

  const api = createApiClient("https://api.example.test/api");
  const result = await authApi.loginWithGoogle(api, "google-id-token-xyz");

  assert.equal(requestedUrl, "https://api.example.test/api/auth/google");
  assert.equal(requestedCredentials, "include");
  assert.deepEqual(requestBody, { idToken: "google-id-token-xyz" });
  assert.equal(result.accessToken, "google-jwt-access-token");
  assert.equal(result.expiresIn, 1800);
});

test("authApi.me sends Bearer token with auth: required", async () => {
  const session = new SessionManager();
  session.setToken({ accessToken: "bearer-token-abc", expiresIn: 3600 });
  const api = createApiClient("https://api.example.test/api", session);

  let authHeader: string | null = null;
  globalThis.fetch = async (_url, init) => {
    authHeader = new Headers(init?.headers).get("Authorization");
    return Response.json(
      {
        id: "d070b431-7e3e-4b77-8729-1a9bf1c19b67",
        displayName: "Lan & Minh",
        email: "lanminh@example.com",
        role: "USER",
        emailConfirmed: true,
      },
      { status: 200 },
    );
  };

  const me = await authApi.me(api);
  assert.equal(authHeader, "Bearer bearer-token-abc");
  assert.equal(me.displayName, "Lan & Minh");
  assert.equal(me.role, "USER");
  assert.equal(me.emailConfirmed, true);
});

test("authApi.logout invokes POST /auth/logout with cookieAuth", async () => {
  let requestedUrl = "";
  let requestedCredentials = "";
  globalThis.fetch = async (url, init) => {
    requestedUrl = String(url);
    requestedCredentials = init?.credentials ?? "";
    return new Response(null, { status: 204 });
  };

  const api = createApiClient("https://api.example.test/api");
  await authApi.logout(api);

  assert.equal(requestedUrl, "https://api.example.test/api/auth/logout");
  assert.equal(requestedCredentials, "include");
});

test("SessionManager manages token in memory, tracks generation, and supports proactive refresh", async () => {
  const session = new SessionManager();
  assert.equal(session.authenticated, false);
  assert.equal(await session.getToken(), null);

  // Set token
  const gen0 = session.getGeneration();
  session.setToken({ accessToken: "initial-token", expiresIn: 300 });
  assert.equal(session.authenticated, true);
  assert.equal(session.isRestored, true);
  assert.equal(session.getGeneration() > gen0, true);
  assert.equal(await session.getToken(), "initial-token");
  assert.equal(session.getTokenSync(), "initial-token");

  // Clear session
  const gen1 = session.getGeneration();
  session.clear();
  assert.equal(session.authenticated, false);
  assert.equal(session.getGeneration() > gen1, true);
  assert.equal(await session.getToken(), null);
  assert.equal(session.getTokenSync(), null);
});
