import Link from "next/link";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/shared/skeleton-rows";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { jobListQuerySchema } from "@/lib/validation/jobs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobPagination } from "@/components/jobs/job-pagination";
import { PublicJobCard } from "@/components/jobs/public-job-card";
export const metadata = {
  title: "Careers | Hirevelo",
  description: "Browse open vacancies and find your next role.",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = jobListQuerySchema.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <>
        <PageHeader title="Careers" />
        <EmptyState
          title="Invalid filters"
          message="Reset your search and try again."
          action={<Link href="/careers">Reset search</Link>}
        />
      </>
    );
  const { q, page } = parsed.data;
  return (
    <>
      <PageHeader title="Careers" />
      <JobFilters key={q} q={q} />
      <Suspense fallback={<SkeletonRows />}>
        <PublicJobList q={q} page={page} />
      </Suspense>
    </>
  );
}

async function PublicJobList({ q, page }: { q: string; page?: number }) {
  const jobs = await getPublishedJobs({ q, page });
  return (
    <>
      {jobs.items.length ? (
        <ul className="rounded-panel border border-border-subtle bg-surface">
          <>
            {jobs.items.map((job) => (
              <PublicJobCard key={job.id} job={job} />
            ))}
          </>
        </ul>
      ) : (
        <EmptyState
          title="No open jobs found"
          message="Try another search or check back for new roles."
        />
      )}
      <JobPagination path="/careers" q={q} {...jobs} />
    </>
  );
}
