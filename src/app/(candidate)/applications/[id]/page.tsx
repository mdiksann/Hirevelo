import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyApplication } from "@/lib/queries/applications";
import { applicationIdSchema } from "@/lib/validation/applications";
import { PageHeader } from "@/components/shared/page-header";
import { StageBadge } from "@/components/applications/stage-badge";
import { PipelineStepper } from "@/components/applications/pipeline-stepper";
import { formatDate } from "@/lib/utils";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = applicationIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const row = await getMyApplication(parsed.data);
  if (!row) notFound();
  return (
    <>
      <PageHeader
        title={row.job.title}
        description={`${row.job.location} · Applied ${formatDate(row.appliedAt)}`}
      />
      <section className="space-y-6 rounded-panel border border-border-subtle bg-surface p-6">
        <h2 className="text-[length:var(--hv-text-title)] font-semibold">
          Application status
        </h2>
        <StageBadge stage={row.stage} />
        <PipelineStepper stage={row.stage} />
        {row.stage === "REJECTED" && (
          <div>
            <h2 className="font-semibold">Rejection reason</h2>
            <p className="whitespace-pre-wrap break-words text-sm">
              {row.rejectionReason}
            </p>
          </div>
        )}
        <div className="border-t border-border-subtle pt-4">
          <h2 className="font-semibold">Cover note</h2>
          <p className="whitespace-pre-wrap break-words text-sm text-ink-body">
            {row.coverNote || "No cover note provided."}
          </p>
        </div>
        <a
          className="inline-block text-sm text-accent-ink"
          href={`/api/files/${row.cvFile.id}`}
        >
          Download CV: {row.cvFile.originalName}
        </a>
      </section>
      <Link
        className="mt-4 inline-block text-sm text-accent-ink"
        href="/applications"
      >
        My applications
      </Link>
    </>
  );
}
