"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  const t = useTranslator();
  return (
    <div aria-busy="true" aria-label={t("Loading dashboard")}>
      <PageHeader title={t("Dashboard")} />
      <div className="mb-4 grid grid-cols-1 rounded-panel border border-border-subtle bg-surface sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-4 p-5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="space-y-4 rounded-panel border border-border-subtle bg-surface p-5"
          >
            <Skeleton className="h-4 w-40" />
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <Skeleton key={row} className="h-8 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
