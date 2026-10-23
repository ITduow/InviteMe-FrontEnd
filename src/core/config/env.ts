import { z } from "zod";
import { apiBaseUrl } from "./api-url";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .url()
    .refine((value) => /^https?:\/\//.test(value), "Use an HTTP(S) URL")
    .optional(),
);

export const env = z
  .object({
    apiUrl: optionalUrl.transform((value) => value && apiBaseUrl(value)),
    signalrUrl: optionalUrl,
    appUrl: optionalUrl,
    // Public Google OAuth client ID — required for Google login button.
    // Leave empty to disable the Google login button gracefully.
    googleClientId: z.string().optional(),
  })
  .parse({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    signalrUrl: process.env.NEXT_PUBLIC_SIGNALR_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });
