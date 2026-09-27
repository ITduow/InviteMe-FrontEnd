import { test } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/core/auth/session";
import { ApiError } from "../src/core/api/api-error";
import type { TokenResponse } from "../src/core/auth/auth.types";

test("concurrent refresh calls share one backend request", async () => {
  let requests = 0;
  const session = new Session({
    refreshEnabled: true,
    refresh: async () => {
      requests += 1;
      return { accessToken: "token", expiresIn: 3600 };
    },
    onClear: () => undefined,
  });
  const result = await Promise.all([session.refresh(), session.refresh(), session.refresh()]);
  assert.equal(requests, 1);
  assert.deepEqual(result, ["token", "token", "token"]);
});
test("late refresh cannot restore a signed-out session", async () => {
  let finish: (value: TokenResponse) => void = () => {
    throw new Error("Refresh not started");
  };
  const session = new Session({
    refreshEnabled: true,
    refresh: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    onClear: () => undefined,
  });
  const request = session.refresh();
  session.clear();
  finish({ accessToken: "old-token", expiresIn: 3600 });
  assert.equal(await request, null);
  assert.equal(session.getStatus(), "anonymous");
});
test("refresh unsupported means no persistence and no refresh request", async () => {
  const session = new Session({
    refreshEnabled: false,
    refresh: async () => {
      throw new Error("Must not call refresh");
    },
    onClear: () => undefined,
  });
  await session.bootstrap();
  assert.equal(session.getStatus(), "anonymous");
});
test("refresh rejection clears authentication", async () => {
  const session = new Session({
    refreshEnabled: true,
    refresh: async () => {
      throw new ApiError(401, "unauthenticated", "Sign in");
    },
    onClear: () => undefined,
  });
  await session.bootstrap();
  assert.equal(session.getStatus(), "anonymous");
});
test("network outage remains retryable rather than pretending the user signed out", async () => {
  const session = new Session({
    refreshEnabled: true,
    refresh: async () => {
      throw new ApiError(0, "network", "Offline");
    },
    onClear: () => undefined,
  });
  await session.bootstrap();
  assert.equal(session.getStatus(), "error");
});
