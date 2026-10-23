import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";
import type { RegisterInput } from "../schemas/register.schema";
import type { LoginInput } from "../schemas/login.schema";

const accountSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.email(),
  role: z.enum(["USER", "ADMIN"]),
  emailConfirmed: z.boolean(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});
export type AccountDto = z.infer<typeof accountSchema>;

export type ProfileInput = {
  displayName: string;
  phone: string | null;
  avatarUrl: string | null;
};

/**
 * Response shape for POST /auth/login and POST /auth/google.
 * The refresh token is set as an HttpOnly cookie by the backend; only
 * accessToken + expiresIn are returned in the JSON body for in-memory storage.
 */
export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const authApi = {
  // ── Public (anonymous) ──────────────────────────────────────────────────

  register: (api: ApiClient, input: Pick<RegisterInput, "displayName" | "email" | "password">) =>
    api.request("/auth/register", {
      method: "POST",
      auth: "none",
      body: { displayName: input.displayName, email: input.email, password: input.password },
      schema: accountSchema,
    }),

  resendConfirmation: (api: ApiClient, email: string) =>
    api.request("/auth/resend-confirmation", {
      method: "POST",
      auth: "none",
      body: { email },
      schema: z.void(),
    }),

  confirmEmail: (api: ApiClient, email: string, code: string) =>
    api.request("/auth/confirm-email", {
      method: "POST",
      auth: "none",
      body: { email, code },
      schema: z.void(),
    }),

  forgotPassword: (api: ApiClient, email: string) =>
    api.request("/auth/forgot-password", {
      method: "POST",
      auth: "none",
      body: { email },
      schema: z.void(),
    }),

  resetPassword: (api: ApiClient, input: { email: string; code: string; newPassword: string }) =>
    api.request("/auth/reset-password", {
      method: "POST",
      auth: "none",
      cookieAuth: true,
      body: input,
      schema: z.void(),
    }),

  /**
   * POST /auth/login — email + password credentials.
   * Backend sets the refresh cookie; FE stores only the access token in memory.
   */
  login: (api: ApiClient, input: LoginInput) =>
    api.request("/auth/login", {
      method: "POST",
      auth: "none",
      cookieAuth: true,
      body: { email: input.email, password: input.password },
      schema: tokenResponseSchema,
    }),

  /** POST /admin/auth/login. The backend issues a session only for active Admin accounts. */
  adminLogin: (api: ApiClient, input: LoginInput) =>
    api.request("/admin/auth/login", {
      method: "POST",
      auth: "none",
      cookieAuth: true,
      body: { email: input.email, password: input.password },
      schema: tokenResponseSchema,
    }),

  /**
   * POST /auth/google — exchange a Google id_token for a session.
   * Backend validates the id_token, upserts the user, and sets the refresh cookie.
   */
  loginWithGoogle: (api: ApiClient, idToken: string) =>
    api.request("/auth/google", {
      method: "POST",
      auth: "none",
      cookieAuth: true,
      body: { idToken },
      schema: tokenResponseSchema,
    }),

  // ── Authenticated ────────────────────────────────────────────────────────

  /**
   * GET /auth/me — fetch the current user profile.
   * Requires a valid Bearer access token.
   */
  me: (api: ApiClient) =>
    api.request("/auth/me", {
      method: "GET",
      auth: "required",
      schema: accountSchema,
    }),

  updateProfile: (api: ApiClient, input: ProfileInput) =>
    api.request("/auth/me", {
      method: "PUT",
      auth: "required",
      body: input,
      schema: accountSchema,
    }),

  changePassword: (api: ApiClient, input: { currentPassword: string; newPassword: string }) =>
    api.request("/auth/change-password", {
      method: "POST",
      auth: "required",
      cookieAuth: true,
      body: input,
      schema: z.void(),
    }),

  deleteAccount: (api: ApiClient, input: { password?: string; googleIdToken?: string }) =>
    api.request("/auth/account", {
      method: "DELETE",
      auth: "required",
      cookieAuth: true,
      body: input,
      schema: z.void(),
    }),

  /**
   * POST /auth/logout — revoke the backend session and the refresh cookie.
   * Uses Bearer + cookie credentials; the backend will expire the cookie.
   */
  logout: (api: ApiClient) =>
    api.request("/auth/logout", {
      method: "POST",
      auth: "none",
      cookieAuth: true,
      schema: z.void(),
    }),
};
