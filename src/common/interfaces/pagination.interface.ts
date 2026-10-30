export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PageMeta;
}

// docs/backend-foundation.md fixes the list shape as { items, meta: { page, limit, total } }.
export function buildPaginated<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return { items, meta: { page, limit, total } };
}
