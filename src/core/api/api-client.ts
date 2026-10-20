import { z } from "zod";
import { ApiError, isAbortError, normalizeHttpError } from "./api-error";
import type { ApiSession } from "./api-session";

type BaseRequestOptions = Omit<RequestInit, "body" | "credentials"> & {
  body?: unknown;
  auth?: "required" | "none";
  cookieAuth?: boolean;
};
type RequestOptions<T> = BaseRequestOptions & { schema: z.ZodType<T> };
export function createApiClient(baseUrl: string | undefined, session?: ApiSession) {
  const send = async (path: string, options: BaseRequestOptions): Promise<Response> => {
    if (!baseUrl)
      throw new ApiError(0, "configuration", "The API connection has not been configured.");
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://"))
      throw new Error("API paths must be relative to the configured API.");
    const { body, auth = "required", cookieAuth = false, ...init } = options;
    const generation = session?.getGeneration();
    const checkSession = () => {
      if (auth === "required" && session?.getGeneration() !== generation)
        throw new DOMException("Session changed", "AbortError");
    };
    let token = auth === "required" ? ((await session?.getToken()) ?? null) : null;
    if (auth === "required" && !token) throw normalizeHttpError(401, null);
    const perform = async () => {
      checkSession();
      init.signal?.throwIfAborted();
      const headers = new Headers(init.headers);
      if (!headers.has("Accept")) headers.set("Accept", "application/json");
      headers.delete("Authorization");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const isForm = typeof FormData !== "undefined" && body instanceof FormData;
      if (body !== undefined && !isForm) headers.set("Content-Type", "application/json");
      try {
        return await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
          ...init,
          headers,
          cache: "no-store",
          credentials: cookieAuth ? "include" : "omit",
          body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
        });
      } catch (error) {
        if (isAbortError(error) || init.signal?.aborted) throw error;
        throw new ApiError(
          0,
          "network",
          "Cannot reach InviteMe. Check your connection and try again.",
        );
      }
    };
    let response = await perform();
    checkSession();
    if (response.status === 401 && auth === "required" && session) {
      token = await session.recover(token);
      checkSession();
      init.signal?.throwIfAborted();
      if (token) response = await perform();
      checkSession();
      if (response.status === 401) session.clear();
    }
    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        if (isAbortError(error)) throw error;
      }
      throw normalizeHttpError(response.status, payload);
    }
    checkSession();
    return response;
  };
  const execute = async <T>(
    path: string,
    options: RequestOptions<T>,
  ): Promise<{ data: T; status: number }> => {
    const { schema, ...init } = options;
    const response = await send(path, init);
    let payload: unknown;
    try {
      payload = response.status === 204 ? undefined : await response.json();
    } catch (error) {
      if (isAbortError(error)) throw error;
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success)
      throw new ApiError(
        response.status,
        "invalid-response",
        "The server returned an unexpected response. Please try again later.",
      );
    return { data: parsed.data, status: response.status };
  };
  return {
    async request<T>(path: string, options: RequestOptions<T>): Promise<T> {
      return (await execute(path, options)).data;
    },
    requestWithStatus: execute,
    async download(path: string, options: BaseRequestOptions = {}): Promise<Blob> {
      const headers = new Headers(options.headers);
      headers.set("Accept", "text/csv");
      const response = await send(path, { ...options, headers });
      return response.blob();
    },
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
