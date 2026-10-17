import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";
import type { RegisterInput } from "../schemas/register.schema";
const accountSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.email(),
  role: z.enum(["USER", "ADMIN"]),
  emailConfirmed: z.boolean(),
});
export const authApi = {
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
};
