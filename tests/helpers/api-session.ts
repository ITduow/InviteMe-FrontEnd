import type { ApiSession } from "../../src/core/api/api-session";
export class Session implements ApiSession {
  private token: string | null = null;
  private generation = 0;
  constructor(
    private options: {
      refreshEnabled: boolean;
      refresh: () => Promise<{ accessToken: string; expiresIn: number }>;
      onClear: () => void;
    },
  ) {}
  accept(value: { accessToken: string; expiresIn: number }) {
    this.token = value.accessToken;
    this.generation++;
  }
  getGeneration() {
    return this.generation;
  }
  async getToken() {
    return this.token;
  }
  async recover() {
    this.token = this.options.refreshEnabled ? (await this.options.refresh()).accessToken : null;
    return this.token;
  }
  clear() {
    this.token = null;
    this.generation++;
    this.options.onClear();
  }
}
