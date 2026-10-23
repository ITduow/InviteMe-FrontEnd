/** Accept the backend origin or the legacy API base URL. */
export function apiBaseUrl(value: string): string {
  const url = new URL(value);
  const path = url.pathname.replace(/\/+$/, "");
  if (path && path !== "/api") {
    throw new Error("NEXT_PUBLIC_API_URL must be a backend origin or end in /api");
  }
  if (url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_API_URL must not include a query or fragment");
  }
  return `${url.origin}/api`;
}
