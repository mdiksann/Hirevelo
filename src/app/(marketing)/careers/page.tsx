import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { jobListQuerySchema } from "@/lib/validation/jobs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobPagination } from "@/components/jobs/job-pagination";
import { PublicJobCard } from "@/components/jobs/public-job-card";
export async function generateMetadata() {
  const t = await getTranslator();
  return {
    title: t("Careers | Hirevelo"),
    description: t("Browse open vacancies and find your next role."),
  };
}
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
        <PageHeader title={t("Careers")} />
        <EmptyState
          title={t("Invalid filters")}
          message={t("Reset your search and try again.")}
          action={<Link href="/careers">{t("Reset search")}</Link>}
        />
      </>
    );
  const { q, page } = parsed.data;
  // Resolve the list before rendering: streamed Suspense reveals require JavaScript.
  const jobList = await PublicJobList({ q, page });
  return (
    <>
      <section className="careers-intro">
        <h2>{t("Your next opportunity starts here.")}</h2>
        <h1>{t("Careers")}</h1>
        <p>{t("Browse open vacancies and find your next role.")}</p>
      </section>
      <JobFilters key={q} q={q} />
      {jobList}
    </>
  );
}

async function PublicJobList({ q, page }: { q: string; page?: number }) {
  const t = await getTranslator();
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
          title={t("No open jobs found")}
          message={t("Try another search or check back for new roles.")}
        />
      )}
      <JobPagination path="/careers" q={q} {...jobs} />
    </>
  );
}
