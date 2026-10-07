import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplicationForRecruiter } from "@/lib/queries/applications";
import { applicationIdSchema } from "@/lib/validation/applications";
import { PageHeader } from "@/components/shared/page-header";
import { PipelineStepper } from "@/components/applications/pipeline-stepper";
import { StageBadge } from "@/components/applications/stage-badge";
import { JobButton as Button } from "@/components/jobs/job-button";
import { StageActions } from "@/components/pipeline/StageActions";
import { NoteComposer } from "@/components/pipeline/NoteComposer";
import { ActivityTimeline } from "@/components/pipeline/ActivityTimeline";
import {
  getApplicationActivity,
  getApplicationNotes,
} from "@/lib/queries/activity";
import { ApplicationPagination } from "@/components/applications/application-pagination";
import { formatDateTime } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ page?: string; notesPage?: string }>;
}) {
  const t = await getTranslator();
  const parsed = applicationIdSchema.safeParse((await params).applicationId);
  if (!parsed.success) notFound();
  const row = await getApplicationForRecruiter(parsed.data);
  if (!row) notFound();
  const query = await searchParams;
  const [activity, notes] = await Promise.all([
    getApplicationActivity(row.id, { page: query.page }),
    getApplicationNotes(row.id, { page: query.notesPage }),
  ]);
  const path = `/recruiter/candidates/${row.id}`;
  return (
    <>
      <PageHeader
        title={row.candidate.name}
        description={t("{email} · {title} · Applied {date}", {
          email: row.candidate.email,
          title: row.job.title,
          date: formatDate(row.appliedAt, t.locale),
        })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/recruiter/jobs/${row.job.id}`}>
                {t("View job")}
              </Link>
            </Button>
            <Button asChild>
              <a href={`/api/files/${row.cvFile.id}`}>{t("Download CV")}</a>
            </Button>
          </div>
        }
      />
      <section className="space-y-6 rounded-panel border border-border-subtle bg-surface p-6">
        <StageBadge stage={row.stage} />
        <PipelineStepper stage={row.stage} />
        <div>
          <h2 className="font-semibold">{t("Cover note")}</h2>
          <p className="whitespace-pre-wrap break-words text-sm text-ink-body">
            {row.coverNote || "No cover note provided."}
          </p>
        </div>
        {row.rejectionReason && (
          <div>
            <h2 className="font-semibold">{t("Rejection reason")}</h2>
            <p className="whitespace-pre-wrap break-words text-sm">
              {row.rejectionReason}
            </p>
          </div>
        )}
        <section
          aria-label={t("Stage actions")}
          className="border-t border-border-subtle pt-4"
        >
          <h2
            id="stage-actions-heading"
            tabIndex={-1}
            className="text-[length:var(--hv-text-title)] font-semibold"
          >
            {t("Stage actions")}
          </h2>
          <StageActions
            key={row.id}
            applicationId={row.id}
            stage={row.stage}
            archived={row.jobArchived}
          />
        </section>
        <section
          aria-label={t("Interview notes")}
          className="border-t border-border-subtle pt-4"
        >
          <h2 className="text-[length:var(--hv-text-title)] font-semibold">
            {t("Interview notes")}
          </h2>
          <NoteComposer applicationId={row.id} archived={row.jobArchived} />
          {notes.items.length ? (
            <ol aria-label={t("Interview notes")} className="mt-4 space-y-4">
              {notes.items.map((note) => (
                <li key={note.id}>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {note.body}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {note.author} ·{" "}
                    <time dateTime={note.createdAt}>
                      {formatDateTime(note.createdAt, t.locale)}
                    </time>
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("No interview notes yet.")}
            </p>
          )}
          <ApplicationPagination
            {...notes}
            path={path}
            pageParam="notesPage"
            label={t("Notes pagination")}
            filters={{ page: query.page }}
          />
        </section>
        <section
          aria-label={t("Activity timeline")}
          className="border-t border-border-subtle pt-4"
        >
          <h2 className="text-[length:var(--hv-text-title)] font-semibold">
            {t("Activity timeline")}
          </h2>
          <ActivityTimeline items={activity.items} />
          <ApplicationPagination
            {...activity}
            path={path}
            label={t("Activity pagination")}
            filters={{ notesPage: query.notesPage }}
          />
        </section>
      </section>
      <Link
        href="/recruiter/candidates"
        className="mt-4 inline-block text-sm text-accent-ink"
      >
        {t("All candidates")}
      </Link>
    </>
  );
}
