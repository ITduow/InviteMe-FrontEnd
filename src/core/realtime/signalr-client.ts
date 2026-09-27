import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import {
  REALTIME_EVENTS,
  weddingEventSchema,
  type RealtimeEvent,
  type WeddingEvent,
} from "./realtime-events";

export type RealtimeStatus =
  "disabled" | "disconnected" | "connecting" | "connected" | "reconnecting";

export class RealtimeClient {
  private connection: HubConnection | undefined;
  private activeWedding: string | null = null;
  private generation = 0;
  private queue: Promise<void> = Promise.resolve();
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private status: RealtimeStatus;
  private listeners = new Set<() => void>();
  private resyncListeners = new Set<() => void>();
  private handlers = new Map<RealtimeEvent, Set<(event: WeddingEvent) => void>>();
  constructor(
    private url: string | undefined,
    private getToken: () => Promise<string | null>,
  ) {
    this.status = url ? "disconnected" : "disabled";
  }
  getStatus = () => this.status;
  getServerStatus = (): RealtimeStatus => (this.url ? "disconnected" : "disabled");
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private setStatus(status: RealtimeStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
  onResync(listener: () => void) {
    this.resyncListeners.add(listener);
    return () => {
      this.resyncListeners.delete(listener);
    };
  }
  on(event: RealtimeEvent, listener: (event: WeddingEvent) => void) {
    const listeners = this.handlers.get(event) ?? new Set();
    listeners.add(listener);
    this.handlers.set(event, listeners);
    return () => {
      listeners.delete(listener);
    };
  }
  private createConnection() {
    if (!this.url) return undefined;
    const connection = new HubConnectionBuilder()
      .withUrl(this.url, {
        accessTokenFactory: async () => {
          const token = await this.getToken();
          if (!token) throw new Error("Authentication required");
          return token;
        },
      })
      .withAutomaticReconnect([0, 2_000, 10_000, 30_000])
      .configureLogging(LogLevel.None)
      .build();
    for (const event of Object.values(REALTIME_EVENTS)) {
      connection.on(event, (payload: unknown) => {
        const parsed = weddingEventSchema.safeParse(payload);
        if (
          this.connection === connection &&
          parsed.success &&
          parsed.data.weddingId === this.activeWedding
        )
          this.handlers.get(event)?.forEach((handler) => handler(parsed.data));
      });
    }
    connection.onreconnecting(() => {
      if (this.connection === connection) this.setStatus("reconnecting");
    });
    connection.onreconnected(async () => {
      const wedding = this.activeWedding;
      if (!wedding || this.connection !== connection) return;
      try {
        await connection.invoke("JoinWedding", wedding);
        if (wedding === this.activeWedding && this.connection === connection) {
          this.setStatus("connected");
          this.resyncListeners.forEach((listener) => listener());
        }
      } catch {
        await connection.stop();
      }
    });
    connection.onclose(() => {
      if (this.connection !== connection) return;
      this.setStatus("disconnected");
      this.scheduleRetry();
    });
    return connection;
  }
  private scheduleRetry() {
    clearTimeout(this.retryTimer);
    if (this.activeWedding)
      this.retryTimer = setTimeout(() => {
        void this.activate(this.activeWedding);
      }, 10_000);
  }
  activate(weddingId: string | null): Promise<void> {
    this.activeWedding = weddingId;
    const generation = ++this.generation;
    clearTimeout(this.retryTimer);
    this.queue = this.queue
      .catch(() => undefined)
      .then(async () => {
        if (generation !== this.generation) return;
        if (!this.url) return;
        const previous = this.connection;
        this.connection = undefined;
        if (previous) await previous.stop();
        if (generation !== this.generation) return;
        if (!weddingId) {
          this.setStatus("disconnected");
          return;
        }
        this.connection = this.createConnection();
        if (!this.connection) return;
        this.setStatus("connecting");
        try {
          await this.connection.start();
          if (generation !== this.generation) return;
          await this.connection.invoke("JoinWedding", weddingId);
          if (generation !== this.generation) return;
          this.setStatus("connected");
          clearTimeout(this.retryTimer);
          this.resyncListeners.forEach((listener) => listener());
        } catch {
          if (this.connection.state !== HubConnectionState.Disconnected)
            await this.connection.stop();
          this.setStatus("disconnected");
          this.scheduleRetry();
        }
      });
    return this.queue;
  }
}
