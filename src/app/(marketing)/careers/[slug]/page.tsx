import { getTranslator } from "@/lib/i18n/server";
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
  const t = await getTranslator();
  return {
    title: `${job.title} | Hirevelo`,
    description: `${job.title} · ${job.location} · ${t(employmentLabels[job.employmentType])}`,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getTranslator();
  const job = await readJob((await params).slug);
  const session = await auth();
  const candidate = session?.user.role === "CANDIDATE";
  const applied = candidate && (await hasAppliedToJob(job.id));
  return (
    <article className="mx-auto max-w-[720px] rounded-panel border border-border-subtle bg-surface">
      <div className="p-6">
        <PageHeader
          title={job.title}
          description={`${job.location} · ${t(employmentLabels[job.employmentType])}`}
        />
        <p className="mb-4 text-xs text-muted-foreground">
          {t(formatSalary(job.salaryMin, job.salaryMax, t.locale))}
        </p>
        <JobDescription description={job.description} />
      </div>
      <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 rounded-b-panel border-t border-border-subtle bg-surface px-6 py-4">
        <Link href="/careers" className="text-sm text-accent-ink">
          {t("All jobs")}
        </Link>
        {!session ? (
          <Button asChild>
            <Link
              href={`/sign-in?returnTo=${encodeURIComponent(`/careers/${job.slug}/apply`)}`}
            >
              {t("Sign in to apply")}
            </Link>
          </Button>
        ) : candidate ? (
          applied ? (
            <div>
              <Button disabled>{t("Apply")}</Button>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("You have already applied to this job.")}
              </p>
              <Link
                href="/applications"
                className="mt-2 inline-flex min-h-10 items-center text-sm text-accent-ink"
              >
                {t("View my applications")}
              </Link>
            </div>
          ) : (
            <Button asChild>
              <Link href={`/careers/${job.slug}/apply`}>{t("Apply")}</Link>
            </Button>
          )
        ) : (
          <Button asChild variant="outline">
            <Link href={`/recruiter/jobs/${job.id}`}>
              {t("Manage this job")}
            </Link>
          </Button>
        )}
      </footer>
    </article>
  );
}
