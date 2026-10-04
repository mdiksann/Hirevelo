import { Skeleton } from "@/components/ui/skeleton";
export function SkeletonRows() {
  return (
    <div aria-busy="true" aria-label="Loading content">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex h-14 items-center gap-2 border-b border-border-subtle px-3"
        >
          <Skeleton className="size-8 rounded-control bg-[var(--hv-skeleton)]" />
          <div className="grid gap-2">
            <Skeleton className="h-3 w-30 bg-[var(--hv-skeleton)]" />
            <Skeleton className="h-2.5 w-20 bg-[var(--hv-skeleton)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
