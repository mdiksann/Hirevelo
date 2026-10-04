export type PaginationParams = { page?: number; pageSize?: number };
export function paginate({ page = 1, pageSize = 20 }: PaginationParams = {}) {
  const take = Number.isFinite(pageSize)
    ? Math.min(100, Math.max(1, Math.trunc(pageSize)))
    : 20;
  const safePage = Number.isFinite(page)
    ? Math.min(
        Math.floor(Number.MAX_SAFE_INTEGER / take),
        Math.max(1, Math.trunc(page)),
      )
    : 1;
  return { page: safePage, pageSize: take, skip: (safePage - 1) * take, take };
}
