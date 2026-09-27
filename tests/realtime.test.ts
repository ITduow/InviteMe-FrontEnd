import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { HubConnectionBuilder, HubConnectionState, type HubConnection } from "@microsoft/signalr";
import { RealtimeClient } from "../src/core/realtime/signalr-client";

class FakeConnection {
  state = HubConnectionState.Disconnected;
  starts = 0;
  stops = 0;
  joins: string[] = [];
  handlers = new Map<string, (payload: unknown) => void>();
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
