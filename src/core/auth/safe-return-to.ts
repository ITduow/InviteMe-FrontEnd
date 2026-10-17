/** Accept only local paths, including after URL normalization. */
export function safeReturnTo(value: string): string {
  const fallback = "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value))
    return fallback;
  try {
    const base = "https://inviteme.invalid";
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname.startsWith("//")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
