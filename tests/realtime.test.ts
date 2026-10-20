import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { setImmediate as flush } from "node:timers/promises";
import { HubConnectionBuilder, HubConnectionState, type HubConnection } from "@microsoft/signalr";
import { RealtimeClient } from "../src/core/realtime/signalr-client";
import { SessionManager } from "../src/core/auth/session-manager";

class FakeConnection {
  state = HubConnectionState.Disconnected;
  starts = 0;
  stops = 0;
  joins: string[] = [];
  handlers = new Map<string, (payload: unknown) => void>();
  sends: unknown[][] = [];
  async send(...args: unknown[]) {
    this.sends.push(args);
  }
  closed = () => {};
  reconnecting = () => {};
  reconnected: () => Promise<void> = async () => {};
  async start() {
    this.starts += 1;
    this.state = HubConnectionState.Connected;
  }
  async stop() {
    this.stops += 1;
    this.state = HubConnectionState.Disconnected;
    this.closed();
  }
  async invoke(method: string, weddingId: string) {
    assert.equal(method, "JoinWedding");
    this.joins.push(weddingId);
  }
  on(event: string, callback: (payload: unknown) => void) {
    this.handlers.set(event, callback);
  }
  onclose(callback: () => void) {
    this.closed = callback;
  }
  onreconnecting(callback: () => void) {
    this.reconnecting = callback;
  }
  onreconnected(callback: () => Promise<void>) {
    this.reconnected = callback;
  }
}
afterEach(() => mock.restoreAll());

test("pointer uses send without hub completion and rejects the wrong wedding or disconnected client", async () => {
  const connection = new FakeConnection();
  mock.method(
    HubConnectionBuilder.prototype,
    "build",
    () => connection as unknown as HubConnection,
  );
  const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
  await assert.rejects(client.sendSeatingPointer("one", "lease"));
  try {
    await client.activate("one");
    await client.sendSeatingPointer("one", "lease", "board", 0.2, 0.3, 1, "table", 2);
    assert.deepEqual(connection.sends, [
      ["MoveSeatingPointerWithTarget", "one", "lease", "board", 0.2, 0.3, 1, "table", 2],
    ]);
    await assert.rejects(client.sendSeatingPointer("other", "lease"));
  } finally {
    await client.activate(null);
  }
});

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

test("runtime connects to the configured hub using the current session token", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SIGNALR_URL;
  process.env.NEXT_PUBLIC_SIGNALR_URL = "https://api.example.test/hubs/weddings";
  try {
    const { createRuntime } = await import("../src/core/config/runtime");
    const connection = new FakeConnection();
    mock.method(
      HubConnectionBuilder.prototype,
      "build",
      () => connection as unknown as HubConnection,
    );
    const withUrl = mock.method(HubConnectionBuilder.prototype, "withUrl");
    const { realtime, session, queryClient } = createRuntime();
    try {
      session.setToken({ accessToken: "owner-token", expiresIn: 3600 });
      await realtime.activate("one");
      assert.equal(realtime.getStatus(), "connected");
      assert.deepEqual(connection.joins, ["one"]);
      const [url, options] = withUrl.mock.calls[0]!.arguments;
      assert.equal(url, process.env.NEXT_PUBLIC_SIGNALR_URL);
      const tokenFactory = (options as { accessTokenFactory: () => Promise<string> })
        .accessTokenFactory;
      assert.equal(await tokenFactory(), "owner-token");
      session.setToken({ accessToken: "renewed-token", expiresIn: 3600 });
      assert.equal(await tokenFactory(), "renewed-token");
      session.clear();
      await assert.rejects(tokenFactory(), /Authentication required/);
    } finally {
      await realtime.activate(null);
      queryClient.clear();
    }
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SIGNALR_URL;
    else process.env.NEXT_PUBLIC_SIGNALR_URL = previousUrl;
  }
});

test("planning weddingChanged invalidations are scoped, validated and delivered to seating listeners", async () => {
  const connection = new FakeConnection();
  mock.method(
    HubConnectionBuilder.prototype,
    "build",
    () => connection as unknown as HubConnection,
  );
  const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
  const received: number[] = [];
  client.on("SeatingUpdated", (event) => received.push(event.version));
  await client.activate("one");
  const emit = connection.handlers.get("weddingChanged");
  emit?.({ type: "PlanningSeatingChanged", entityId: "other", version: 1 });
  emit?.({ type: "PlanningSeatingChanged", entityId: "one", version: "bad" });
  emit?.({ type: "Unknown", entityId: "one", version: 1 });
  emit?.({ type: "PlanningSeatingChanged", entityId: "one", version: 7 });
  emit?.({ type: "PlanningGuestsImported", entityId: "one", version: null });
  emit?.({ type: "RsvpChanged", entityId: "guest-one", version: 9 });
  assert.deepEqual(received, [7, 0, 9]);
  await client.activate(null);
  emit?.({ type: "PlanningSeatingChanged", entityId: "one", version: 8 });
  assert.deepEqual(received, [7, 0, 9]);
});

test("one active wedding connection; switching and logout stop prior connections", async () => {
  const connections: FakeConnection[] = [];
  mock.method(HubConnectionBuilder.prototype, "build", () => {
    const connection = new FakeConnection();
    connections.push(connection);
    return connection as unknown as HubConnection;
  });
  const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
  await client.activate("one");
  await client.activate("two");
  assert.equal(connections.length, 2);
  assert.equal(connections[0]?.stops, 1);
  assert.deepEqual(connections[0]?.joins, ["one"]);
  assert.deepEqual(connections[1]?.joins, ["two"]);
  assert.equal(client.getStatus(), "connected");
  await client.activate(null);
  assert.equal(connections[1]?.stops, 1);
  assert.equal(client.getStatus(), "disconnected");
});

test("events are validated/scoped and reconnect rejoins before requesting resync", async () => {
  const connection = new FakeConnection();
  mock.method(
    HubConnectionBuilder.prototype,
    "build",
    () => connection as unknown as HubConnection,
  );
  const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
  let events = 0;
  let resyncs = 0;
  const unsubscribe = client.on("SeatingUpdated", () => {
    events += 1;
  });
  const unresync = client.onResync(() => {
    resyncs += 1;
  });
  await client.activate("one");
  connection.handlers.get("SeatingUpdated")?.({ weddingId: "other", version: 1 });
  connection.handlers.get("SeatingUpdated")?.({ weddingId: "one", version: "bad" });
  connection.handlers.get("SeatingUpdated")?.({ weddingId: "one", version: 2 });
  assert.equal(events, 1);
  connection.reconnecting();
  assert.equal(client.getStatus(), "reconnecting");
  await connection.reconnected();
  assert.deepEqual(connection.joins, ["one", "one"]);
  assert.equal(resyncs, 2);
  unsubscribe();
  unresync();
  await client.activate(null);
  connection.handlers.get("SeatingUpdated")?.({ weddingId: "one", version: 3 });
  assert.equal(events, 1);
});

test("rapid mount/unmount skips obsolete queued starts", async () => {
  let builds = 0;
  mock.method(HubConnectionBuilder.prototype, "build", () => {
    builds += 1;
    return new FakeConnection() as unknown as HubConnection;
  });
  const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
  await Promise.all([client.activate("one"), client.activate(null)]);
  assert.equal(builds, 0);
  assert.equal(client.getStatus(), "disconnected");
});

test("drag snapshots are validated and scoped; commands reject disconnected or stale wedding sessions", async () => {
  const connection = new FakeConnection();
  mock.method(
    HubConnectionBuilder.prototype,
    "build",
    () => connection as unknown as HubConnection,
  );
  const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
  const received: number[] = [];
  const pointers: number[] = [];
  client.onSeatingDrags((snapshot) => received.push(snapshot.revision));
  client.onSeatingPointer((pointer) => pointers.push(pointer.sequence));
  await client.activate("one");
  const emit = connection.handlers.get("SeatingDragSnapshot");
  emit?.({ weddingId: "other", revision: 1, leases: [] });
  emit?.({ weddingId: "one", revision: "bad", leases: [] });
  emit?.({ weddingId: "one", revision: 2, leases: [] });
  assert.deepEqual(received, [2]);
  const emitPointer = connection.handlers.get("SeatingDragPointer");
  const pointer = {
    weddingId: "one",
    connectionId: "tab",
    dragId: "gesture",
    anchor: "queue",
    x: 0.5,
    y: 0.5,
    sequence: 1,
  };
  emitPointer?.({ ...pointer, weddingId: "other" });
  emitPointer?.({ ...pointer, x: 2 });
  emitPointer?.(pointer);
  assert.deepEqual(pointers, [1]);
  await assert.rejects(client.invokeSeating("GetSeatingDrags", "other"), /DISCONNECTED/);
  const pending = deferred();
  mock.method(connection, "invoke", () => pending.promise);
  const loading = client.invokeSeating("GetSeatingDrags", "one");
  await client.activate(null);
  pending.resolve();
  await assert.rejects(loading, /DISCONNECTED/);
  await assert.rejects(client.invokeSeating("StartSeatingDrag", "one", ["place"]), /DISCONNECTED/);
  emit?.({ weddingId: "one", revision: 3, leases: [] });
  emitPointer?.({ ...pointer, sequence: 2 });
  assert.deepEqual(received, [2]);
  assert.deepEqual(pointers, [1]);
});

test("reconnect resync waits for rejoin and ignores a wedding left during rejoin", async () => {
  const connection = new FakeConnection();
  mock.method(
    HubConnectionBuilder.prototype,
    "build",
    () => connection as unknown as HubConnection,
  );
  const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
  let resyncs = 0;
  let events = 0;
  client.onResync(() => resyncs++);
  client.on("SeatingUpdated", () => events++);
  await client.activate("one");
  const joined = deferred();
  mock.method(connection, "invoke", () => joined.promise);
  connection.reconnecting();
  const reconnect = connection.reconnected();
  assert.equal(client.getStatus(), "reconnecting");
  assert.equal(resyncs, 1);
  const leaving = client.activate(null);
  connection.handlers.get("SeatingUpdated")?.({ weddingId: "one", version: 2 });
  joined.resolve();
  await Promise.all([reconnect, leaving]);
  assert.equal(resyncs, 1);
  assert.equal(events, 0);
  assert.equal(client.getStatus(), "disconnected");
});

test("an obsolete failed start cannot publish disconnected after switching wedding", async () => {
  const first = new FakeConnection();
  const second = new FakeConnection();
  const connections = [first, second];
  mock.method(
    HubConnectionBuilder.prototype,
    "build",
    () => connections.shift() as unknown as HubConnection,
  );
  const started = deferred();
  mock.method(first, "start", () => started.promise);
  const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
  const statuses: string[] = [];
  client.subscribe(() => statuses.push(client.getStatus()));
  const opening = client.activate("one");
  await flush();
  const switching = client.activate("two");
  started.reject(new Error("Network unavailable"));
  await Promise.all([opening, switching]);
  assert.deepEqual(statuses, ["connecting", "connecting", "connected"]);
  assert.deepEqual(second.joins, ["two"]);
  await client.activate(null);
});

for (const failure of ["start", "closed", "rejoin"] as const) {
  test(`recovery after ${failure} creates a new connection, rejoins and resyncs`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const first = new FakeConnection();
    const second = new FakeConnection();
    const connections = [first, second];
    mock.method(
      HubConnectionBuilder.prototype,
      "build",
      () => connections.shift() as unknown as HubConnection,
    );
    if (failure === "start")
      mock.method(first, "start", async () => {
        throw new Error("Offline");
      });
    const client = new RealtimeClient("https://api.example.test/hub", async () => "token");
    let resyncs = 0;
    client.onResync(() => resyncs++);
    try {
      await client.activate("one");
      if (failure === "closed") {
        first.state = HubConnectionState.Disconnected;
        first.closed();
      } else if (failure === "rejoin") {
        mock.method(first, "invoke", async () => {
          throw new Error("Rejoin failed");
        });
        first.reconnecting();
        await first.reconnected();
      }
      assert.equal(client.getStatus(), "disconnected");
      const before = resyncs;
      t.mock.timers.tick(10_000);
      await flush();
      assert.deepEqual(second.joins, ["one"]);
      assert.equal(client.getStatus(), "connected");
      assert.equal(resyncs, before + 1);
      await client.activate(null);
      t.mock.timers.tick(10_000);
      await flush();
      assert.equal(connections.length, 0);
      assert.equal(second.stops, 1);
      assert.equal(client.getStatus(), "disconnected");
    } finally {
      await client.activate(null);
    }
  });
}

test("expired session refresh supplies a new token before reconnect and rejoin", async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/api";
  t.after(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousUrl;
  });
  const session = new SessionManager();
  session.setToken({ accessToken: "old", expiresIn: 3600 });
  const fetch = mock.method(globalThis, "fetch", async () =>
    Response.json({ accessToken: "renewed", expiresIn: 3600 }),
  );
  const connection = new FakeConnection();
  mock.method(
    HubConnectionBuilder.prototype,
    "build",
    () => connection as unknown as HubConnection,
  );
  const withUrl = mock.method(HubConnectionBuilder.prototype, "withUrl");
  const client = new RealtimeClient("https://api.example.test/hub", () => session.getToken());
  try {
    await client.activate("one");
    const options = withUrl.mock.calls[0]!.arguments[1] as {
      accessTokenFactory: () => Promise<string>;
    };
    assert.equal(await options.accessTokenFactory(), "old");
    session.setToken({ accessToken: "old", expiresIn: 0 });
    connection.reconnecting();
    assert.deepEqual(await Promise.all([options.accessTokenFactory(), session.getToken()]), [
      "renewed",
      "renewed",
    ]);
    assert.equal(fetch.mock.callCount(), 1);
    assert.equal(
      String(fetch.mock.calls[0]!.arguments[0]),
      "https://api.example.test/api/auth/refresh",
    );
    await connection.reconnected();
    assert.deepEqual(connection.joins, ["one", "one"]);
    assert.equal(client.getStatus(), "connected");
  } finally {
    await client.activate(null);
  }
});
