export type PageRequest = { page: number; pageSize: number; search?: string; sort?: string };
export type PageResponse<T> = { items: T[]; totalCount: number; page: number; pageSize: number };
export type Versioned = { version: number };
