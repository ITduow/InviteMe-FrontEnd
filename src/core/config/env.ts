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
  })
  .parse({
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    signalrUrl: process.env.NEXT_PUBLIC_SIGNALR_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
