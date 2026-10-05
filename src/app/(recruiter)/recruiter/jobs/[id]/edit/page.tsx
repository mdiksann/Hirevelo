import { notFound } from "next/navigation";
import { getJobForRecruiter } from "@/lib/queries/jobs";
import { jobIdSchema } from "@/lib/validation/jobs";
import { PageHeader } from "@/components/shared/page-header";
import { JobForm } from "@/components/jobs/job-form";
import { EmptyState } from "@/components/shared/empty-state";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = jobIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const job = await getJobForRecruiter(parsed.data);
  if (!job) notFound();
  if (job.status === "ARCHIVED")
    return (
      <>
        <PageHeader title={job.title} />
        <EmptyState
          title="Archived job"
          message="Archived jobs are read-only."
        />
      </>
    );
  return (
    <>
      <PageHeader title="Edit job" />
      <JobForm job={job} />
    </>
  );
}
