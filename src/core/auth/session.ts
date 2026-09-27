import { ApiError } from "../api/api-error";
import type { TokenResponse } from "./auth.types";

export type SessionStatus = "loading" | "authenticated" | "anonymous" | "error";
type SessionOptions = {
  refreshEnabled: boolean;
  refresh: () => Promise<TokenResponse>;
  onClear: () => void;
};

// One instance per browser provider, never a process-global SSR token singleton.
export class Session {
  private token: string | null = null;
  private expiresAt = 0;
  private generation = 0;
  private status: SessionStatus = "loading";
  private refreshFlight: Promise<string | null> | null = null;
  private listeners = new Set<() => void>();
  constructor(private options: SessionOptions) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getStatus = () => this.status;
  getGeneration = () => this.generation;
  getServerStatus = (): SessionStatus => "loading";
  private emit(status: SessionStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
  accept(data: TokenResponse) {
    this.generation += 1;
    this.refreshFlight = null;
    this.options.onClear();
    this.token = data.accessToken;
    this.expiresAt = Date.now() + data.expiresIn * 1000;
    this.emit("authenticated");
  }
  clear = () => {
    this.generation += 1;
    this.refreshFlight = null;
    this.token = null;
    this.expiresAt = 0;
    this.options.onClear();
    this.emit("anonymous");
  };
  async bootstrap() {
    if (this.status !== "loading" && this.status !== "error") return;
    this.emit("loading");
    const generation = this.generation;
    try {
      await this.refresh();
    } catch {
      if (generation === this.generation) this.emit("error");
    }
  }
  async getToken() {
    if (this.token && Date.now() < this.expiresAt - 30_000) return this.token;
    return this.refresh();
  }
  async recover(rejectedToken: string | null) {
    if (this.token && this.token !== rejectedToken) return this.token;
    return this.refresh();
  }
  refresh(): Promise<string | null> {
    if (!this.options.refreshEnabled) {
      this.clear();
      return Promise.resolve(null);
    }
    if (this.refreshFlight) return this.refreshFlight;
    const generation = this.generation;
    const flight = (async () => {
      try {
        const result = await this.options.refresh();
        if (generation !== this.generation) return null;
        this.token = result.accessToken;
        this.expiresAt = Date.now() + result.expiresIn * 1000;
        this.emit("authenticated");
        return this.token;
      } catch (error) {
        if (
          generation === this.generation &&
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          this.clear();
          return null;
        }
        throw error;
      }
    })();
    this.refreshFlight = flight;
    void flight
      .finally(() => {
        if (this.refreshFlight === flight) this.refreshFlight = null;
      })
      .catch(() => undefined);
    return flight;
  }
}
