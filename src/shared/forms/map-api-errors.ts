import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/core/api/api-error";
export function mapApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: Partial<Record<string, FieldPath<T>>>,
) {
  setError("root.server", {
    message: error instanceof ApiError ? error.message : "Unable to save. Please try again.",
  });
  if (error instanceof ApiError)
    for (const [key, messages] of Object.entries(error.fieldErrors)) {
      const field = fields[key];
      if (field)
        setError(field, { type: "server", message: messages[0] ?? "Please check this value." });
    }
}
