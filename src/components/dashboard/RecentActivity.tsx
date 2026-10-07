"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import type { RecentActivityDto } from "@/lib/queries/dashboard";
import { ActivityTimeline } from "@/components/pipeline/ActivityTimeline";
export function RecentActivity({ items }: { items: RecentActivityDto[] }) {
  const t = useTranslator();
  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="rounded-panel border border-border-subtle bg-surface"
    >
      <h2
        id="recent-activity-heading"
        className="border-b border-border-subtle px-5 py-4 text-[length:var(--hv-text-title)] font-semibold"
      >
        {t("Recent activity")}
      </h2>
      <div className="p-5">
        <ActivityTimeline
          label={t("Recent activity")}
          items={items.map((item) => ({
            ...item,
            ...(item.application
              ? {
                  link: {
                    href: `/recruiter/candidates/${item.application.id}`,
                    label: `${item.application.candidate.name}${item.job ? ` · ${item.job.title}` : ""}`,
                  },
                }
              : item.job
                ? {
                    link: {
                      href: `/recruiter/jobs/${item.job.id}`,
                      label: item.job.title,
                    },
                  }
                : {}),
          }))}
        />
      </div>
    </section>
  );
}
