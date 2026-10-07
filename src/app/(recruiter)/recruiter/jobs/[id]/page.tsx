import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobForRecruiter } from "@/lib/queries/jobs";
import { jobIdSchema } from "@/lib/validation/jobs";
import { employmentLabels, formatSalary } from "@/lib/jobs";
import { PageHeader } from "@/components/shared/page-header";
import { JobButton as Button } from "@/components/jobs/job-button";
import { JobPreview } from "@/components/jobs/job-preview";
import { searchApplications } from "@/lib/queries/applications";
import { jobListQuerySchema } from "@/lib/validation/jobs";
import { CandidateTable } from "@/components/applications/candidate-table";
import { ApplicationPagination } from "@/components/applications/application-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { JobStatusActions } from "@/components/jobs/job-status-actions";
import { JobDescription } from "@/components/jobs/job-description";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslator();
  const parsed = jobIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const job = await getJobForRecruiter(parsed.data);
  if (!job) notFound();
  const paging = jobListQuerySchema
    .pick({ page: true })
    .safeParse(await searchParams);
  const applicants = paging.success
    ? await searchApplications({
        jobId: job.id,
        page: paging.data.page,
        pageSize: 20,
      })
    : null;
  const applicantsPath = `/recruiter/candidates?jobId=${job.id}`;
  return (
    <>
      <PageHeader
        title={job.title}
        description={t("{location} · {employment} · {count} applicants", {
          location: job.location,
          employment: t(employmentLabels[job.employmentType]),
          count: job.applicantsCount,
        })}
        actions={
          <div className="flex flex-wrap gap-2">
            <JobPreview job={job} />
            {job.status !== "ARCHIVED" && (
              <Button asChild variant="outline">
                <Link href={`/recruiter/jobs/${job.id}/edit`}>
                  {t("Edit job")}
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <article className="rounded-panel border border-border-subtle bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <JobStatusBadge status={job.status} />
          <p className="text-xs text-muted-foreground">
            {t(formatSalary(job.salaryMin, job.salaryMax, t.locale))}
          </p>
        </div>
        <JobDescription description={job.description} />
        <div className="mt-4 border-t border-border-subtle pt-4">
          <JobStatusActions job={job} />
        </div>
        {job.status === "PUBLISHED" && (
          <p className="mt-4 text-sm">
            <Link href={`/careers/${job.slug}`} className="text-accent-ink">
              {t("View public job")}
            </Link>
          </p>
        )}
      </article>
      <section
        aria-labelledby="job-applicants-heading"
        className="mt-4 rounded-panel border border-border-subtle bg-surface p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2
            id="job-applicants-heading"
            className="text-[length:var(--hv-text-title)] font-semibold"
          >
            {t("Applicants")}
          </h2>
          <Link
            href={applicantsPath}
            className="inline-flex min-h-10 items-center text-sm text-accent-ink"
          >
            {t("Search and filter applicants")}
          </Link>
        </div>
        {!applicants ? (
          <EmptyState
            title={t("Invalid page")}
            message={t("Reset pagination to view applicants.")}
            action={
              <Link href={`/recruiter/jobs/${job.id}`}>
                {t("Reset pagination")}
              </Link>
            }
          />
        ) : (
          <>
            {applicants.items.length ? (
              <CandidateTable applications={applicants.items} />
            ) : (
              <EmptyState
                title={t("No applicants on this page")}
                message={t(
                  applicants.total
                    ? "Return to the first page to view applicants."
                    : "Applicants will appear here after candidates apply.",
                )}
                action={
                  applicants.total ? (
                    <Link href={`/recruiter/jobs/${job.id}`}>
                      {t("First page")}
                    </Link>
                  ) : undefined
                }
              />
            )}
            <ApplicationPagination
              {...applicants}
              path={`/recruiter/jobs/${job.id}`}
              label={t("Job applicants pagination")}
            />
          </>
        )}
      </section>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/recruiter/jobs">{t("All jobs")}</Link>
      </Button>
    </>
  );
}
