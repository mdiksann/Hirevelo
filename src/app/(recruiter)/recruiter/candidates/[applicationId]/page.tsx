import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplicationForRecruiter } from "@/lib/queries/applications";
import { applicationIdSchema } from "@/lib/validation/applications";
import { PageHeader } from "@/components/shared/page-header";
import { StageBadge } from "@/components/applications/stage-badge";
import { JobButton as Button } from "@/components/jobs/job-button";
import { formatDate } from "@/lib/utils";
export default async function Page({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const parsed = applicationIdSchema.safeParse((await params).applicationId);
  if (!parsed.success) notFound();
  const row = await getApplicationForRecruiter(parsed.data);
  if (!row) notFound();
  return (
    <>
      <PageHeader
        title={row.candidate.name}
        description={`${row.candidate.email} · ${row.job.title} · Applied ${formatDate(row.appliedAt)}`}
        actions={
          <Button asChild>
            <a href={`/api/files/${row.cvFile.id}`}>Download CV</a>
          </Button>
        }
      />
      <section className="space-y-6 rounded-panel border border-border-subtle bg-surface p-6">
        <StageBadge stage={row.stage} />
        <div>
          <h2 className="font-semibold">Cover note</h2>
          <p className="whitespace-pre-wrap break-words text-sm text-ink-body">
            {row.coverNote || "No cover note provided."}
          </p>
        </div>
        {row.rejectionReason && (
          <div>
            <h2 className="font-semibold">Rejection reason</h2>
            <p className="whitespace-pre-wrap break-words text-sm">
              {row.rejectionReason}
            </p>
          </div>
        )}
        {[
          { title: "Stage actions", ticket: "HF-035" },
          { title: "Interview notes", ticket: "HF-036" },
          { title: "Activity timeline", ticket: "HF-037" },
        ].map((item) => (
          <section
            key={item.ticket}
            aria-label={item.title}
            className="border-t border-border-subtle pt-4"
          >
            <h2 className="text-[length:var(--hv-text-title)] font-semibold">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Coming in {item.ticket}.
            </p>
          </section>
        ))}
      </section>
      <Link
        href="/recruiter/candidates"
        className="mt-4 inline-block text-sm text-accent-ink"
      >
        All candidates
      </Link>
    </>
  );
}
