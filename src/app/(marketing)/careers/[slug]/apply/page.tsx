import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireCandidate } from "@/lib/auth-helpers";
import { AuthError, ForbiddenError } from "@/lib/errors";
import { jobSlugSchema } from "@/lib/validation/jobs";
import { getJobBySlug, hasAppliedToJob } from "@/lib/queries/jobs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ApplyForm } from "@/components/applications/apply-form";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const parsed = jobSlugSchema.safeParse((await params).slug);
  if (!parsed.success) notFound();
  try {
    await requireCandidate();
  } catch (error) {
    if (error instanceof AuthError)
      redirect(
        `/sign-in?returnTo=${encodeURIComponent(`/careers/${parsed.data}/apply`)}`,
      );
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }
  const job = await getJobBySlug(parsed.data);
  if (!job) notFound();
  const applied = await hasAppliedToJob(job.id);
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader title={`Apply for ${job.title}`} description={job.location} />
      {applied ? (
        <EmptyState
          title="You have already applied to this job"
          message="View your submitted application and current status."
          action={
            <Link href="/applications" className="text-accent-ink">
              My applications
            </Link>
          }
        />
      ) : (
        <ApplyForm jobId={job.id} />
      )}
    </div>
  );
}
