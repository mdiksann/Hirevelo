"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import type { RecruiterJobDto } from "@/lib/queries/jobs";
import { employmentLabels, formatSalary } from "@/lib/jobs";
import { JobDescription } from "@/components/jobs/job-description";
import { JobButton as Button } from "@/components/jobs/job-button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function JobPreview({ job }: { job: RecruiterJobDto }) {
  const t = useTranslator();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{t("Preview job")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-48px)] overflow-y-auto rounded-panel p-5 shadow-[var(--hv-shadow-overlay)] sm:max-w-[560px]">
        <DialogTitle>{job.title}</DialogTitle>
        <DialogDescription>
          {job.location} · {t(employmentLabels[job.employmentType])}
        </DialogDescription>
        <p className="text-xs text-muted-foreground">
          {t(formatSalary(job.salaryMin, job.salaryMax, t.locale))}
        </p>
        <JobDescription description={job.description} />
      </DialogContent>
    </Dialog>
  );
}
