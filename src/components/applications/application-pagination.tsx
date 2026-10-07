"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import Link from "next/link";
export function ApplicationPagination({
  path,
  filters = {},
  page,
  pageSize,
  total,
  pageParam = "page",
  label = "Applications pagination",
}: {
  path: string;
  filters?: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  pageParam?: string;
  label?: string;
}) {
  const t = useTranslator();
  function href(target: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
      if (value) query.set(key, value);
    query.set(pageParam, String(target));
    return `${path}?${query}`;
  }
  return (
    <nav
      aria-label={t(label)}
      className="mt-4 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground"
    >
      <p>
        {t(
          total === 0 || (page - 1) * pageSize >= total
            ? "0"
            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`,
        )}{" "}
        {t("of")} {total}
      </p>
      <div className="flex gap-4">
        {page > 1 && (
          <Link
            className="inline-flex min-h-8 items-center text-accent-ink"
            href={href(page - 1)}
          >
            {t("Previous")}
          </Link>
        )}
        {page * pageSize < total && (
          <Link
            className="inline-flex min-h-8 items-center text-accent-ink"
            href={href(page + 1)}
          >
            {t("Next")}
          </Link>
        )}
      </div>
    </nav>
  );
}
