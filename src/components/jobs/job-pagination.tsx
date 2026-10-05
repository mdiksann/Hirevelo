import Link from "next/link";
export function JobPagination({
  path,
  q,
  status,
  page,
  pageSize,
  total,
}: {
  path: string;
  q: string;
  status?: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  const href = (target: number) => {
    const params = new URLSearchParams({ q, page: String(target) });
    if (status) params.set("status", status);
    return `${path}?${params}`;
  };
  return (
    <nav
      aria-label="Jobs pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground"
    >
      <p>
        {total === 0 || (page - 1) * pageSize >= total
          ? "0"
          : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`}{" "}
        of {total}
      </p>
      <div className="flex gap-4">
        {page > 1 && (
          <Link
            href={href(page - 1)}
            className="inline-flex min-h-8 items-center text-accent-ink max-sm:min-h-10"
          >
            Previous
          </Link>
        )}
        {page * pageSize < total && (
          <Link
            href={href(page + 1)}
            className="inline-flex min-h-8 items-center text-accent-ink max-sm:min-h-10"
          >
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
