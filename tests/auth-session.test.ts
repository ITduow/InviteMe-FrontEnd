import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { SessionManager } from "../src/core/auth/session-manager";
import { createApiClient } from "../src/core/api/api-client";
import { safeReturnTo } from "../src/core/auth/safe-return-to";
import { apiBaseUrl } from "../src/core/config/api-url";
import { getWeddingAccess } from "../src/features/weddings/api/wedding.api";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEXT_PUBLIC_API_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalUrl;
});
function session(expiresIn = 900) {
  process.env.NEXT_PUBLIC_API_URL = "https://api.test";
  const value = new SessionManager();
  value.setToken({ accessToken: "old", expiresIn });
  return value;
}
test("backend origin and legacy API base resolve to one API URL", () => {
  assert.equal(apiBaseUrl("https://api.test"), "https://api.test/api");
  assert.equal(apiBaseUrl("https://api.test/api/"), "https://api.test/api");
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
for (const expiresIn of [30, 0, 900]) {
  test(`real session refresh continues request (expiresIn=${expiresIn})`, async () => {
    const auth = session(expiresIn);
    const generation = auth.getGeneration();
    let refreshes = 0;
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith("/auth/refresh")) {
        assert.equal(String(url), "https://api.test/api/auth/refresh");
        refreshes++;
        return Response.json({ accessToken: "new", expiresIn: 900 });
      }
      calls++;
      if (expiresIn === 900 && calls === 1) return new Response(null, { status: 401 });
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer new");
      return Response.json({ ok: true });
    };
    assert.deepEqual(
      await createApiClient("https://api.test/api", auth).request("/test", {
        schema: z.object({ ok: z.boolean() }),
      }),
      { ok: true },
    );
    assert.equal(refreshes, 1);
    assert.equal(auth.getGeneration(), generation);
  });
}
for (const status of [200, 401, 403]) {
  for (const action of ["logout", "login"] as const) {
    test(`late refresh ${status} cannot change session after ${action}`, async () => {
      const auth = session();
      const response = deferred<Response>();
      globalThis.fetch = () => response.promise;
      const pending = auth.recover("old");
      if (action === "logout") auth.clear();
      else auth.setToken({ accessToken: "account-b", expiresIn: 900 });
      response.resolve(
        status === 200
          ? Response.json({ accessToken: "stale", expiresIn: 900 })
          : new Response(null, { status }),
      );
      assert.equal(await pending, null);
      assert.equal(auth.getTokenSync(), action === "logout" ? null : "account-b");
    });
  }
}
test("refresh discarded if session changes while reading response body", async () => {
  const auth = session();
  const body = deferred<{ accessToken: string; expiresIn: number }>();
  const reading = deferred<void>();
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: () => {
        reading.resolve();
        return body.promise;
      },
    }) as Response;
  const pending = auth.recover("old");
  await reading.promise;
  auth.clear();
  body.resolve({ accessToken: "stale", expiresIn: 900 });
  assert.equal(await pending, null);
  assert.equal(auth.authenticated, false);
});
for (const status of [401, 403]) {
  test(`proactive refresh ${status} returns null without TypeError`, async () => {
    const auth = session(30);
    globalThis.fetch = async () => new Response(null, { status });
    assert.equal(await auth.getToken(), null);
    assert.equal(auth.authenticated, false);
  });
}
test("concurrent refresh requests share one fetch", async () => {
  const auth = session(30);
  const response = deferred<Response>();
  let calls = 0;
  globalThis.fetch = () => {
    calls++;
    return response.promise;
  };
  const first = auth.getToken();
  const second = auth.getToken();
  response.resolve(Response.json({ accessToken: "new", expiresIn: 900 }));
  assert.deepEqual(await Promise.all([first, second]), ["new", "new"]);
  assert.equal(calls, 1);
});
test("temporary refresh failure preserves unexpired token", async () => {
  const auth = session(30);
  globalThis.fetch = async () => new Response(null, { status: 503 });
  assert.equal(await auth.getToken(), "old");
});
test("returnTo accepts local paths and rejects external or normalized external destinations", () => {
  assert.equal(
    safeReturnTo("/weddings/123/guests?search=Lan#list"),
    "/weddings/123/guests?search=Lan#list",
  );
  for (const target of [
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "/\n/evil.example",
    "/a/..//evil.example",
  ])
    assert.equal(safeReturnTo(target), "/dashboard");
});
test("wedding access comes from authenticated API and must match the requested wedding", async () => {
  const auth = session();
  const api = createApiClient("https://api.test/api", auth);
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://api.test/api/weddings/wedding-a/access");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer old");
    return Response.json({ weddingId: "wedding-a", permissions: ["GUEST_VIEW"] });
  };
  assert.deepEqual((await getWeddingAccess(api, "wedding-a")).permissions, ["GUEST_VIEW"]);
  globalThis.fetch = async () =>
    Response.json({ weddingId: "wedding-b", permissions: ["GUEST_VIEW"] });
  await assert.rejects(getWeddingAccess(api, "wedding-a"), { code: "invalid-response" });
});
