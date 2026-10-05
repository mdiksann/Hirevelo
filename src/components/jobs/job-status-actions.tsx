"use client";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const destructive = target !== "PUBLISHED";
  const consequence =
    target === "ARCHIVED"
      ? "Archiving makes this job and its applications read-only."
      : target === "CLOSED"
        ? `Closing stops new applications. ${job.applicantsCount} existing applications are unaffected.`
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
          {labels[target]}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="rounded-panel p-5 shadow-[var(--hv-shadow-overlay)] sm:max-w-[420px] duration-[140ms]"
      >
        <DialogTitle>{labels[target]} job</DialogTitle>
        <DialogDescription>{consequence}</DialogDescription>
        {error && (
          <p role="alert" className="text-sm text-[var(--hv-danger-ink)]">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
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
                      result.message +
                        (result.errors
                          ? " " + Object.values(result.errors).flat().join(" ")
                          : ""),
                    );
                    return;
                  }
                  toast.success(`Job ${target.toLowerCase()}`);
                  setOpen(false);
                  router.refresh();
                } catch {
                  setError("Unable to connect. Please try again.");
                }
              })
            }
          >
            {pending ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                />
                <span className="sr-only">Updating status</span>
              </>
            ) : (
              labels[target]
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function JobStatusActions({ job }: { job: RecruiterJobDto }) {
  if (job.status === "ARCHIVED")
    return (
      <p className="text-sm text-muted-foreground">
        Archived jobs are read-only.
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
