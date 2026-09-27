export type ApiErrorCode =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "business-rule"
  | "server"
  | "network"
  | "configuration"
  | "invalid-response";

const errors: Record<number, [ApiErrorCode, string]> = {
  400: ["validation", "Please check the information you entered."],
  401: ["unauthenticated", "Please sign in to continue."],
  403: ["forbidden", "You do not have permission to perform this action."],
  404: ["not-found", "The requested item could not be found."],
  409: ["conflict", "This data has changed. Reload the latest version and try again."],
  422: ["business-rule", "This action cannot be completed with the current information."],
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeHttpError(status: number, body: unknown): ApiError {
  const [code, message] = errors[status] ?? [
    "server",
    "Something went wrong. Please try again later.",
  ];
  const fieldErrors: Record<string, string[]> = {};
  // Never render backend detail/title/exception text. Only recognize field names.
  if (
    (status === 400 || status === 422) &&
    body &&
    typeof body === "object" &&
    "errors" in body &&
    body.errors &&
    typeof body.errors === "object"
  ) {
    for (const key of Object.keys(body.errors)) fieldErrors[key] = ["Please check this value."];
  }
  return new ApiError(status, code, message, fieldErrors);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
