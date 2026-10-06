import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getJobBySlug, hasAppliedToJob } from "@/lib/queries/jobs";
import { jobSlugSchema } from "@/lib/validation/jobs";
import { employmentLabels, formatSalary } from "@/lib/jobs";
import { PageHeader } from "@/components/shared/page-header";
import { JobDescription } from "@/components/jobs/job-description";
import { JobButton as Button } from "@/components/jobs/job-button";
async function readJob(slug: string) {
  const parsed = jobSlugSchema.safeParse(slug);
  if (!parsed.success) notFound();
  const job = await getJobBySlug(parsed.data);
  if (!job) notFound();
  return job;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const job = await readJob((await params).slug);
  return {
    title: `${job.title} | Hirevelo`,
    description: `${job.title} · ${job.location} · ${employmentLabels[job.employmentType]}`,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const job = await readJob((await params).slug);
  const session = await auth();
  const candidate = session?.user.role === "CANDIDATE";
  const applied = candidate && (await hasAppliedToJob(job.id));
  return (
    <article className="mx-auto max-w-[720px] rounded-panel border border-border-subtle bg-surface">
      <div className="p-6">
        <PageHeader
          title={job.title}
          description={`${job.location} · ${employmentLabels[job.employmentType]}`}
        />
        <p className="mb-4 text-xs text-muted-foreground">
          {formatSalary(job.salaryMin, job.salaryMax)}
        </p>
        <JobDescription description={job.description} />
      </div>
      <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 rounded-b-panel border-t border-border-subtle bg-surface px-6 py-4">
        <Link href="/careers" className="text-sm text-accent-ink">
          All jobs
        </Link>
        {!session ? (
          <Button asChild>
            <Link
              href={`/sign-in?returnTo=${encodeURIComponent(`/careers/${job.slug}/apply`)}`}
            >
              Sign in to apply
            </Link>
          </Button>
        ) : candidate ? (
          applied ? (
            <div>
              <Button disabled>Apply</Button>
              <p className="mt-2 text-xs text-muted-foreground">
                You have already applied to this job.
              </p>
            </div>
          ) : (
            <Button asChild>
              <Link href={`/careers/${job.slug}/apply`}>Apply</Link>
            </Button>
          )
        ) : (
          <p className="text-xs text-muted-foreground">
            Sign in with a candidate account to apply.
          </p>
        )}
      </footer>
    </article>
  );
}
