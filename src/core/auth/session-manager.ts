/**
 * In-memory session manager.
 *
 * Access token   → JavaScript memory (this class), never localStorage/sessionStorage.
 * Refresh token  → HttpOnly cookie set by the backend; the browser sends it automatically
 *                  on credentialed requests. The frontend never reads it.
 *
 * On page reload the access token is lost. SessionManager.restore() calls /auth/refresh
 * (credentials: "include") so the browser sends the cookie and receives a new access token.
 *
 * Invariants:
 *  - generation increments on every login/logout/clear so in-flight requests abort.
 *  - Only one refresh attempt runs at a time (shared promise).
 *  - NEXT_PUBLIC_AUTH_REFRESH_ENABLED=false disables the refresh path (useful during dev).
 */

import type { ApiSession } from "@/core/api/api-session";

const REFRESH_ENABLED = process.env.NEXT_PUBLIC_AUTH_REFRESH_ENABLED !== "false";

export interface SessionToken {
  accessToken: string;
  /** seconds until expiry (from the backend) */
  expiresIn: number;
  /** Date.now() at the time the token was stored */
  issuedAt: number;
}

type SessionListener = () => void;

export class SessionManager implements ApiSession {
  private token: SessionToken | null = null;
  private generation = 0;
  private refreshPromise: Promise<string | null> | null = null;
  private listeners = new Set<SessionListener>();
  private restored = false;

  // ── ApiSession interface ──────────────────────────────────────────────────

  getGeneration(): number {
    return this.generation;
  }

  async getToken(): Promise<string | null> {
    if (!this.token) return null;
    const msUntilExpiry = this.token.expiresIn * 1000 - (Date.now() - this.token.issuedAt);
    if (msUntilExpiry <= 0) {
      // Access token has expired; must refresh.
      return this.refresh();
    }
    if (msUntilExpiry < 60_000) {
      // Proactively refresh if less than 60s remain.
      // If refresh fails temporarily, return the unexpired token so the current request can proceed.
      const refreshed = await this.refresh();
      return refreshed ?? this.token?.accessToken ?? null;
    }
    return this.token.accessToken;
  }

  async recover(rejectedToken: string | null): Promise<string | null> {
    // Do not retry if the rejected token is already gone (another request cleared it).
    if (rejectedToken && this.token?.accessToken !== rejectedToken) {
      return this.token?.accessToken ?? null;
    }
    return this.refresh();
  }

  clear(): void {
    this.token = null;
    this.generation++;
    this.refreshPromise = null;
    this.restored = true;
    this.emit();
  }

  // ── Public helpers ────────────────────────────────────────────────────────

  /**
   * Store a new access token after a successful login.
   * Increments generation so stale request chains abort.
   */
  setToken(raw: { accessToken: string; expiresIn: number }): void {
    this.token = {
      accessToken: raw.accessToken,
      expiresIn: raw.expiresIn,
      issuedAt: Date.now(),
    };
    this.generation++;
    this.refreshPromise = null;
    this.restored = true;
    this.emit();
  }

  /**
   * Returns the raw access token value without triggering proactive refresh.
   * Use only where you need the value synchronously (e.g., logout call).
   */
  getTokenSync(): string | null {
    return this.token?.accessToken ?? null;
  }

  /** Whether a token is currently held in memory. */
  get authenticated(): boolean {
    return this.token !== null;
  }

  /** Whether the initial session restore check has completed. */
  get isRestored(): boolean {
    return this.restored;
  }

  /** Subscribe to session change events (login/logout/clear/restore). */
  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Called on app mount to restore the session via the refresh cookie.
   * Returns the access token on success, null if no session exists.
   */
  async restore(): Promise<string | null> {
    if (!REFRESH_ENABLED) {
      this.restored = true;
      this.emit();
      return null;
    }
    const token = await this.refresh();
    this.restored = true;
    this.emit();
    return token;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private refresh(): Promise<string | null> {
    if (!REFRESH_ENABLED) return Promise.resolve(null);
    if (this.refreshPromise) return this.refreshPromise;
    const pending = this.doRefresh(this.generation).finally(() => {
      if (this.refreshPromise === pending) this.refreshPromise = null;
    });
    this.refreshPromise = pending;
    return pending;
  }

  private async doRefresh(generation: number): Promise<string | null> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return null;
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (this.generation !== generation) return null;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.clear();
        }
        return null;
      }
      const data = (await res.json()) as {
        accessToken?: string;
        expiresIn?: number;
      };
      if (this.generation !== generation) return null;
      if (!data.accessToken || typeof data.expiresIn !== "number") return null;
      this.token = {
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
        issuedAt: Date.now(),
      };
      this.emit();
      return this.token.accessToken;
    } catch {
      return null;
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // ignore
      }
    }
  }
}
