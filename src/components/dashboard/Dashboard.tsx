import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { getDashboardStats, getRecentActivity } from "@/lib/queries/dashboard";
import { STAGES, stageLabel } from "@/lib/pipeline";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
export async function Dashboard() {
  const t = await getTranslator();
  const [stats, activity] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
  ]);
  const totalApplications = STAGES.reduce(
    (total, stage) => total + stats.applicationsByStage[stage],
    0,
  );
  const maximum = Math.max(
    1,
    ...STAGES.map((stage) => stats.applicationsByStage[stage]),
  );
  const metrics = [
    {
      label: "Open vacancies",
      value: stats.publishedJobs,
      href: "/recruiter/jobs?status=PUBLISHED",
    },
    { label: "Total candidates", value: stats.totalCandidates },
    { label: "Applications in last 7 days", value: stats.appliedLast7Days },
    {
      label: "Total applications",
      value: totalApplications,
      href: "/recruiter/candidates",
    },
  ];
  return (
    <>
      <PageHeader
        title={t("Dashboard")}
        description={t("Your hiring activity at a glance.")}
      />
      <dl
        aria-label={t("Hiring metrics")}
        className="dashboard-metrics mb-6 grid grid-cols-1 overflow-hidden rounded-panel border border-border-subtle bg-surface sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <div key={metric.label} className="metric-cell p-6">
            <dt className="text-xs text-muted-foreground">{t(metric.label)}</dt>
            <dd className="mt-2 text-[length:var(--hv-text-metric)] leading-[var(--hv-leading-metric)] font-semibold tabular-nums">
              {metric.href ? (
                <Link
                  className="text-ink hover:underline max-sm:inline-flex max-sm:min-h-10 max-sm:items-center"
                  href={metric.href}
                  aria-label={t("{label}: {count}", {
                    label: t(metric.label),
                    count: metric.value,
                  })}
                >
                  {metric.value}
                </Link>
              ) : (
                metric.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {!stats.publishedJobs && !stats.totalCandidates && !totalApplications && (
        <EmptyState
          title={t("No hiring data yet")}
          message={t("Publish a job to start receiving applications.")}
          action={
            <Link
              className="text-sm text-accent-ink"
              href="/recruiter/jobs/new"
            >
              {t("Create a job")}
            </Link>
          }
        />
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="stage-distribution-heading"
          className="rounded-panel border border-border-subtle bg-surface"
        >
          <h2
            id="stage-distribution-heading"
            className="border-b border-border-subtle px-5 py-4 text-[length:var(--hv-text-title)] font-semibold"
          >
            {t("Applications by stage")}
          </h2>
          <div className="space-y-4 p-5">
            {!totalApplications && (
              <p className="text-sm text-muted-foreground">
                {t("No applications yet.")}
              </p>
            )}
            <ul className="space-y-4" aria-label={t("Stage distribution")}>
              {STAGES.map((stage) => (
                <li key={stage}>
                  <Link
                    href={`/recruiter/candidates?stage=${stage}`}
                    aria-label={t("{stage}: {count} applications", {
                      stage: t(stageLabel(stage)),
                      count: stats.applicationsByStage[stage],
                    })}
                    className="block rounded-control text-xs hover:underline max-sm:min-h-10"
                  >
                    <span className="flex justify-between gap-2">
                      <span>{t(stageLabel(stage))}</span>
                      <span className="font-medium tabular-nums">
                        {stats.applicationsByStage[stage]}
                      </span>
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 100 8"
                      preserveAspectRatio="none"
                      className="mt-2 h-2 w-full overflow-hidden rounded-[var(--hv-radius-dot)]"
                    >
                      <rect
                        width="100"
                        height="8"
                        className="fill-[var(--hv-surface-active)]"
                      />
                      <rect
                        width={
                          (100 * stats.applicationsByStage[stage]) / maximum
                        }
                        height="8"
                        className="fill-primary"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <RecentActivity items={activity} />
      </div>
    </>
  );
}
