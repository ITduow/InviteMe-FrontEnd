import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .url()
    .refine((value) => /^https?:\/\//.test(value), "Use an HTTP(S) URL")
    .optional(),
);

export const env = z
  .object({
    apiUrl: optionalUrl,
    signalrUrl: optionalUrl,
    appUrl: optionalUrl,
    refreshEnabled: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .parse({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    signalrUrl: process.env.NEXT_PUBLIC_SIGNALR_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    refreshEnabled: process.env.NEXT_PUBLIC_AUTH_REFRESH_ENABLED,
  });
