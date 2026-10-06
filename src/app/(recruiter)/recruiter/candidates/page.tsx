import Link from "next/link";
import { searchApplications } from "@/lib/queries/applications";
import { getJobsForRecruiter, getJobForRecruiter } from "@/lib/queries/jobs";
import { applicationListSchema } from "@/lib/validation/applications";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CandidateFilters } from "@/components/applications/candidate-filters";
import { CandidateTable } from "@/components/applications/candidate-table";
import { ApplicationPagination } from "@/components/applications/application-pagination";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = applicationListSchema.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <>
        <PageHeader title="Candidates" />
        <EmptyState
          title="Invalid filters"
          message="Reset the filters and try again."
          action={<Link href="/recruiter/candidates">Reset filters</Link>}
        />
      </>
    );
  const params = parsed.data;
  const [result, jobs] = await Promise.all([
    searchApplications({ ...params, pageSize: 20 }),
    getJobsForRecruiter({ pageSize: 100, page: params.jobPage }),
  ]);
  if (params.jobId && !jobs.items.some((job) => job.id === params.jobId)) {
    const selected = await getJobForRecruiter(params.jobId);
    if (selected) jobs.items.push(selected);
  }
  return (
    <>
      <PageHeader title="Candidates" />
      <CandidateFilters
        key={params.q}
        q={params.q}
        jobPagination={{
          page: jobs.page,
          pageSize: jobs.pageSize,
          total: jobs.total,
        }}
        jobs={jobs.items.map((job) => ({ id: job.id, title: job.title }))}
      />
      {result.items.length ? (
        <CandidateTable applications={result.items} />
      ) : (
        <EmptyState
          title="No candidates found"
          message="Change your filters or publish a job to receive applications."
        />
      )}
      <ApplicationPagination
        path="/recruiter/candidates"
        filters={{
          q: params.q,
          jobPage: params.jobPage ? String(jobs.page) : undefined,
          jobId: params.jobId,
          stage: params.stage,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        }}
        {...result}
      />
    </>
  );
}
