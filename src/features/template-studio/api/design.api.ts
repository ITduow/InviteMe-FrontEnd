import { z } from "zod";
import type { ApiClient } from "@/core/api/api-client";
import { studioDocumentSchema } from "../schemas/document";

export const invitationDesignSchema = z.object({
  version: z.number().int().nonnegative(),
  document: studioDocumentSchema.nullable(),
});
export function getInvitationDesign(api: ApiClient, id: string, signal?: AbortSignal) {
  return api.request(`/weddings/${encodeURIComponent(id)}/invitation-design`, {
    signal,
    schema: invitationDesignSchema,
  });
}
export function saveInvitationDesign(
  api: ApiClient,
  id: string,
  expectedVersion: number,
  serialized: string,
) {
  return api.request(`/weddings/${encodeURIComponent(id)}/invitation-design`, {
    method: "PUT",
    body: { expectedVersion, document: studioDocumentSchema.parse(JSON.parse(serialized)) },
    schema: invitationDesignSchema,
  });
}
export const publicInvitationSchema = z.object({
  document: studioDocumentSchema,
  content: z.string(),
});
