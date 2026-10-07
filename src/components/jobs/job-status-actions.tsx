"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { changeJobStatus } from "@/actions/jobs";
import { JOB_TRANSITIONS } from "@/lib/jobs";
import type { RecruiterJobDto } from "@/lib/queries/jobs";
import type { JobStatus } from "@/lib/validation/jobs";
import { JobButton as Button } from "@/components/jobs/job-button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
const labels = {
  DRAFT: "Save draft",
  PUBLISHED: "Publish",
  CLOSED: "Close",
  ARCHIVED: "Archive",
};
function StatusAction({
  job,
  target,
}: {
  job: RecruiterJobDto;
  target: JobStatus;
}) {
  const t = useTranslator();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const destructive = target !== "PUBLISHED";
  const consequence =
    target === "ARCHIVED"
      ? "Archiving makes this job and its applications read-only."
      : target === "CLOSED"
        ? t(
            "Closing stops new applications. {count} existing applications are unaffected.",
            { count: job.applicantsCount },
          )
        : "Publishing makes this job visible on the public careers page.";
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={
            destructive
              ? "border-[var(--hv-danger-border)] text-[var(--hv-danger-ink)] hover:bg-[var(--hv-danger-tint)]"
              : undefined
          }
        >
          {t(labels[target])}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="rounded-panel p-5 shadow-[var(--hv-shadow-overlay)] sm:max-w-[420px] duration-[140ms]"
      >
        <DialogTitle>
          {t(labels[target])}
          {t(" job")}
        </DialogTitle>
        <DialogDescription>{t(consequence)}</DialogDescription>
        {error && (
          <p role="alert" className="text-sm text-[var(--hv-danger-ink)]">
            {t(error)}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {t("Cancel")}
            </Button>
          </DialogClose>
          <Button
            disabled={pending}
            aria-busy={pending}
            variant={destructive ? "destructive" : "default"}
            className="min-w-24"
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await changeJobStatus({
                    id: job.id,
                    status: target,
                  });
                  if (!result.ok) {
                    setError(
                      t(result.message) +
                        (result.errors
                          ? " " +
                            Object.values(result.errors)
                              .flat()
                              .map((message) => t(message))
                              .join(" ")
                          : ""),
                    );
                    return;
                  }
                  toast.success(t(`Job ${target.toLowerCase()}`));
                  setOpen(false);
                  router.refresh();
                } catch {
                  setError("Unable to connect. Please try again.");
                }
              })
            }
          >
            {t(
              pending ? (
                <>
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 animate-spin motion-reduce:animate-none"
                  />
                  <span className="sr-only">{t("Updating status")}</span>
                </>
              ) : (
                labels[target]
              ),
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function JobStatusActions({ job }: { job: RecruiterJobDto }) {
  const t = useTranslator();
  if (job.status === "ARCHIVED")
    return (
      <p className="text-sm text-muted-foreground">
        {t("Archived jobs are read-only.")}
      </p>
    );
  return (
    <div className="flex flex-wrap gap-2">
      {JOB_TRANSITIONS[job.status].map((target) => (
        <StatusAction key={target} job={job} target={target} />
      ))}
    </div>
  );
}
