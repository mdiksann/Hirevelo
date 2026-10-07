"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { LoaderCircle } from "lucide-react";
import type { Stage } from "@/lib/validation/applications";
import { JobButton as Button } from "@/components/jobs/job-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export type TransitionFailure = {
  message: string;
  errors?: Record<string, string[]>;
};
type Props = {
  target: Stage;
  comment: string;
  reason: string;
  pending: boolean;
  failure?: TransitionFailure;
  onComment: (value: string) => void;
  onReason: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};
export function StageTransitionForm({
  target,
  comment,
  reason,
  pending,
  failure,
  onComment,
  onReason,
  onCancel,
  onSubmit,
}: Props) {
  const t = useTranslator();
  const rejected = target === "REJECTED";
  const label = rejected
    ? "Reject application"
    : target === "HIRED"
      ? "Confirm hire"
      : "Confirm move";
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {rejected && (
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">
            {t("Rejection reason (required)")}
          </Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            maxLength={500}
            disabled={pending}
            aria-required="true"
            aria-invalid={!!failure?.errors?.reason}
            aria-describedby="rejection-help rejection-error"
          />
          <p id="rejection-help" className="text-xs text-muted-foreground">
            {t("Enter 3–500 characters. The candidate will see this reason.")}
          </p>
          <p
            id="rejection-error"
            role={failure?.errors?.reason ? "alert" : undefined}
            className="text-sm text-[var(--hv-danger-ink)]"
          >
            {t(failure?.errors?.reason?.[0])}
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="stage-comment">
          {t("Internal comment (optional)")}
        </Label>
        <Textarea
          id="stage-comment"
          value={comment}
          onChange={(e) => onComment(e.target.value)}
          maxLength={2000}
          disabled={pending}
          aria-invalid={!!failure?.errors?.comment}
          aria-describedby="stage-comment-help stage-comment-error"
        />
        <p id="stage-comment-help" className="text-xs text-muted-foreground">
          {t("Recruiters only. Up to 2000 characters.")}
        </p>
        <p
          id="stage-comment-error"
          role={failure?.errors?.comment ? "alert" : undefined}
          className="text-sm text-[var(--hv-danger-ink)]"
        >
          {t(failure?.errors?.comment?.[0])}
        </p>
      </div>
      {failure && (
        <p role="alert" className="text-sm text-[var(--hv-danger-ink)]">
          {t(failure.message)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          id="stage-cancel"
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          {t("Cancel")}
        </Button>
        <Button
          type="submit"
          variant={rejected ? "destructive" : "default"}
          disabled={pending}
          aria-busy={pending}
        >
          {pending && (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {t(pending ? "Updating stage…" : label)}
        </Button>
      </div>
    </form>
  );
}
