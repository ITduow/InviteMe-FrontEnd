import type { ApiClient } from "@/core/api/api-client";
import {
  guestPageSchema,
  participantPageSchema,
  optionsSchema,
  previewSchema,
  resultSchema,
  reportSchema,
  detailSchema,
} from "../schemas/guest.schema";
export type GuestParams = {
  page: number;
  search: string;
  recordStatus: string;
  sort: string;
  withoutInvitation: boolean;
};
export const guestKeys = {
  root: (id: string) => ["guests", id] as const,
  list: (id: string, params: GuestParams) => ["guests", id, "list", params] as const,
  people: (id: string, page: number) => ["guests", id, "people", page] as const,
  report: (id: string) => ["guests", id, "report"] as const,
  options: (id: string) => ["guests", id, "options"] as const,
  detail: (id: string, guestId: string) => ["guests", id, "detail", guestId] as const,
};
const path = (id: string) => `/weddings/${encodeURIComponent(id)}`;
export function getGuestDetail(api: ApiClient, id: string, guestId: string, signal?: AbortSignal) {
  return api.request(`${path(id)}/guests/${encodeURIComponent(guestId)}`, {
    signal,
    schema: detailSchema,
  });
}
export function getGuests(api: ApiClient, id: string, params: GuestParams, signal?: AbortSignal) {
  return api.request(
    `${path(id)}/guests?${new URLSearchParams({ ...params, page: String(params.page), pageSize: "20", withoutInvitation: String(params.withoutInvitation) })}`,
    { signal, schema: guestPageSchema },
  );
}
export function getPeople(api: ApiClient, id: string, page: number, signal?: AbortSignal) {
  return api.request(`${path(id)}/participants?page=${page}&pageSize=20`, {
    signal,
    schema: participantPageSchema,
  });
}
export function getReport(api: ApiClient, id: string, signal?: AbortSignal) {
  return api.request(`${path(id)}/reports/summary`, { signal, schema: reportSchema });
}
export function getOptions(api: ApiClient, id: string, signal?: AbortSignal) {
  return api.request(`${path(id)}/guests/import-options`, { signal, schema: optionsSchema });
}
export function previewFile(api: ApiClient, id: string, file: File, replacesImportId?: string) {
  const body = new FormData();
  body.append("file", file);
  if (replacesImportId) body.append("replacesImportId", replacesImportId);
  return api.request(`${path(id)}/guests/import/preview`, {
    method: "POST",
    body,
    schema: previewSchema,
  });
}
export function confirmFile(
  api: ApiClient,
  id: string,
  body: {
    importId: string;
    groupKeys?: string[];
    rowNumbers?: number[];
    acknowledgeDuplicates: boolean;
  },
) {
  return api.request(`${path(id)}/guests/import/confirm`, {
    method: "POST",
    body,
    schema: resultSchema,
  });
}
