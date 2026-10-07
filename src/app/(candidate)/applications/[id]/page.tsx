import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyApplication } from "@/lib/queries/applications";
import { applicationIdSchema } from "@/lib/validation/applications";
import { PageHeader } from "@/components/shared/page-header";
import { StageBadge } from "@/components/applications/stage-badge";
import { PipelineStepper } from "@/components/applications/pipeline-stepper";
import { getCandidateActivity } from "@/lib/queries/activity";
import { ActivityTimeline } from "@/components/pipeline/ActivityTimeline";
import { ApplicationPagination } from "@/components/applications/application-pagination";
import { formatDate } from "@/lib/utils";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslator();
  const parsed = applicationIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const row = await getMyApplication(parsed.data);
  if (!row) notFound();
  const activity = await getCandidateActivity(row.id, {
    page: (await searchParams).page,
  });
  return (
    <>
      <PageHeader
        title={row.job.title}
        description={t("{location} · Applied {date}", {
          location: row.job.location,
          date: formatDate(row.appliedAt, t.locale),
        })}
      />
      <section className="space-y-6 rounded-panel border border-border-subtle bg-surface p-6">
        <h2 className="text-[length:var(--hv-text-title)] font-semibold">
          {t("Application status")}
        </h2>
        <StageBadge stage={row.stage} />
        <PipelineStepper stage={row.stage} />
        <section
          aria-label={t("Activity timeline")}
          className="border-t border-border-subtle pt-4"
        >
          <h2 className="font-semibold">{t("Activity timeline")}</h2>
          <ActivityTimeline items={activity.items} />
          <ApplicationPagination
            {...activity}
            path={`/applications/${row.id}`}
            label={t("Activity pagination")}
          />
        </section>
        {row.stage === "REJECTED" && (
          <div>
            <h2 className="font-semibold">{t("Rejection reason")}</h2>
            <p className="whitespace-pre-wrap break-words text-sm">
              {row.rejectionReason}
            </p>
          </div>
        )}
        <div className="border-t border-border-subtle pt-4">
          <h2 className="font-semibold">{t("Cover note")}</h2>
          <p className="whitespace-pre-wrap break-words text-sm text-ink-body">
            {row.coverNote || "No cover note provided."}
          </p>
        </div>
        <a
          className="inline-block text-sm text-accent-ink"
          href={`/api/files/${row.cvFile.id}`}
        >
          {t("Download CV:")} {row.cvFile.originalName}
        </a>
      </section>
      <Link
        className="mt-4 inline-block text-sm text-accent-ink"
        href="/applications"
      >
        {t("My applications")}
      </Link>
    </>
  );
}
