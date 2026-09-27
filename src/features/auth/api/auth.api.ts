import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";
import {
  currentUserSchema,
  tokenResponseSchema,
  weddingAccessSchema,
} from "@/core/auth/auth.types";
import type { LoginInput } from "../schemas/login.schema";
export const authKeys = {
  user: ["auth", "current-user"] as const,
  access: (weddingId: string) => ["auth", "wedding-access", weddingId] as const,
};
export const authApi = {
  login: (api: ApiClient, input: LoginInput) =>
    api.request("/auth/login", {
      method: "POST",
      body: input,
      auth: "none",
      cookieAuth: true,
      schema: tokenResponseSchema,
    }),
  logout: (api: ApiClient) =>
    api.request("/auth/logout", {
      method: "POST",
      auth: "none",
      cookieAuth: true,
      schema: z.void(),
    }),
  currentUser: (api: ApiClient, signal: AbortSignal) =>
    api.request("/auth/me", { signal, schema: currentUserSchema }),
  access: (api: ApiClient, weddingId: string, signal: AbortSignal) =>
    api.request(`/weddings/${encodeURIComponent(weddingId)}/access`, {
      signal,
      schema: weddingAccessSchema,
    }),
};
