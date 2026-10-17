// Transport boundary for the future authenticated session implementation.
export interface ApiSession {
  getGeneration(): number;
  getToken(): Promise<string | null>;
  recover(rejectedToken: string | null): Promise<string | null>;
  clear(): void;
}
