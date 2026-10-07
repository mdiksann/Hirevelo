import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { getJobsForRecruiter } from "@/lib/queries/jobs";
import { jobListQuerySchema } from "@/lib/validation/jobs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { JobButton as Button } from "@/components/jobs/job-button";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobTable } from "@/components/jobs/job-table";
import { JobPagination } from "@/components/jobs/job-pagination";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslator();
  const parsed = jobListQuerySchema.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <>
        <PageHeader title={t("Jobs")} />
        <EmptyState
          title={t("Invalid filters")}
          message={t("Reset the filters and try again.")}
          action={<Link href="/recruiter/jobs">{t("Reset filters")}</Link>}
        />
      </>
    );
  const params = parsed.data;
  const jobs = await getJobsForRecruiter({ ...params, pageSize: 20 });
  const tabs = [
    { label: "All", status: undefined },
    { label: "Published", status: "PUBLISHED" },
    { label: "Draft", status: "DRAFT" },
    { label: "Closed", status: "CLOSED" },
  ].map((tab) => ({
    label: tab.label,
    href: `/recruiter/jobs?${new URLSearchParams({ q: params.q, ...(tab.status ? { status: tab.status } : {}) })}`,
    active: params.status === tab.status,
  }));
  return (
    <>
      <PageHeader
        title={t("Jobs")}
        tabs={tabs}
        actions={
          <Button asChild>
            <Link href="/recruiter/jobs/new">{t("New job")}</Link>
          </Button>
        }
      />
      <JobFilters
        key={`${params.q}-${params.status}`}
        q={params.q}
        status={params.status}
        recruiter
      />
      {jobs.items.length ? (
        <JobTable jobs={jobs.items} />
      ) : (
        <EmptyState
          title={t("No jobs found")}
          message={t("Change your filters or create a job.")}
          action={
            <Button asChild>
              <Link href="/recruiter/jobs/new">{t("New job")}</Link>
            </Button>
          }
        />
      )}
      <JobPagination
        path="/recruiter/jobs"
        q={params.q}
        status={params.status}
        {...jobs}
      />
    </>
  );
}
