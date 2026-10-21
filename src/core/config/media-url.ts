import { env } from "./env";

export function resolveMediaUrl(source: string | null | undefined) {
  if (!source) return undefined;
  if (!source.startsWith("/media/")) return source;
  return env.apiUrl ? new URL(source, env.apiUrl).toString() : source;
}
