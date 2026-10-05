import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobForRecruiter } from "@/lib/queries/jobs";
import { jobIdSchema } from "@/lib/validation/jobs";
import { employmentLabels, formatSalary } from "@/lib/jobs";
import { PageHeader } from "@/components/shared/page-header";
import { JobButton as Button } from "@/components/jobs/job-button";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { JobStatusActions } from "@/components/jobs/job-status-actions";
import { JobDescription } from "@/components/jobs/job-description";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = jobIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const job = await getJobForRecruiter(parsed.data);
  if (!job) notFound();
  return (
    <>
      <PageHeader
        title={job.title}
        description={`${job.location} · ${employmentLabels[job.employmentType]} · ${job.applicantsCount} applicants`}
        actions={
          job.status !== "ARCHIVED" && (
            <Button asChild variant="outline">
              <Link href={`/recruiter/jobs/${job.id}/edit`}>Edit job</Link>
            </Button>
          )
        }
      />
      <article className="rounded-panel border border-border-subtle bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <JobStatusBadge status={job.status} />
          <p className="text-xs text-muted-foreground">
            {formatSalary(job.salaryMin, job.salaryMax)}
          </p>
        </div>
        <JobDescription description={job.description} />
        <div className="mt-4 border-t border-border-subtle pt-4">
          <JobStatusActions job={job} />
        </div>
        {job.status === "PUBLISHED" && (
          <p className="mt-4 text-sm">
            <Link href={`/careers/${job.slug}`} className="text-accent-ink">
              View public job
            </Link>
          </p>
        )}
      </article>
    </>
  );
}
