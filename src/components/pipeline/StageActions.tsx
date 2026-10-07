"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveApplicationStage } from "@/actions/pipeline";
import { STAGES, stageLabel, validateTransition } from "@/lib/pipeline";
import type { Stage } from "@/lib/validation/applications";
import { moveStageSchema } from "@/lib/validation/pipeline";
import { JobButton as Button } from "@/components/jobs/job-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  StageTransitionForm,
  type TransitionFailure,
} from "@/components/pipeline/stage-transition-form";
export function StageActions({
  applicationId,
  stage,
  archived,
}: {
  applicationId: string;
  stage: Stage;
  archived: boolean;
}) {
  const t = useTranslator();
  const [target, setTarget] = useState<Stage | null>(null);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState<TransitionFailure>();
  const [pending, startTransition] = useTransition();
  const moveButton = useRef<HTMLButtonElement>(null);
  const rejectButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const targets = STAGES.filter(
    (to) => validateTransition(stage, to, { jobArchived: archived }).ok,
  );
  function open(to: Stage) {
    opener.current =
      to === "REJECTED" ? rejectButton.current : moveButton.current;
    setComment("");
    setReason("");
    setFailure(undefined);
    setTarget(to);
  }
  function close() {
    if (!pending) setTarget(null);
  }
  function restoreFocus(event: Event) {
    event.preventDefault();
    if (opener.current?.isConnected) opener.current.focus();
    else document.getElementById("stage-actions-heading")?.focus();
  }
  function move() {
    if (!target) return;
    const parsed = moveStageSchema.safeParse({
      applicationId,
      toStage: target,
      comment,
      ...(target === "REJECTED" ? { reason } : {}),
    });
    if (!parsed.success) {
      setFailure({
        message: "Please check your input.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    setFailure(undefined);
    startTransition(async () => {
      try {
        const result = await moveApplicationStage(parsed.data);
        if (!result.ok) {
          setFailure(result);
          toast.error(t(result.message));
          return;
        }
        setTarget(null);
        setComment("");
        setReason("");
        toast.success(
          t("Application moved to {stage}", {
            stage: t(stageLabel(parsed.data.toStage)),
          }),
        );
      } catch {
        const message = "Unable to connect. Please try again.";
        setFailure({ message });
        toast.error(t(message));
      }
    });
  }
  if (!targets.length)
    return (
      <p className="text-sm text-muted-foreground">
        {t(
          archived
            ? "Archived jobs are read-only."
            : "This application has reached a final stage.",
        )}
      </p>
    );
  const form = target && (
    <StageTransitionForm
      target={target}
      comment={comment}
      reason={reason}
      pending={pending}
      failure={failure}
      onComment={setComment}
      onReason={setReason}
      onCancel={close}
      onSubmit={move}
    />
  );
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={moveButton}
            variant="outline"
            disabled={pending}
            aria-busy={pending}
          >
            {t("Move to…")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          onCloseAutoFocus={(event) => {
            if (target) event.preventDefault();
          }}
        >
          {targets
            .filter((to) => to !== "REJECTED")
            .map((to) => (
              <DropdownMenuItem key={to} onSelect={() => open(to)}>
                {t(stageLabel(to))}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        ref={rejectButton}
        disabled={pending}
        variant="outline"
        onClick={() => open("REJECTED")}
        className="border-[var(--hv-danger-border)] text-[var(--hv-danger-ink)] hover:bg-[var(--hv-danger-tint)]"
      >
        {t("Reject")}
      </Button>
      <Dialog
        open={!!target && target !== "HIRED"}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={restoreFocus}
          className="rounded-panel p-5 shadow-[var(--hv-shadow-overlay)] sm:max-w-[560px]"
        >
          <DialogTitle>
            {t(
              target === "REJECTED"
                ? "Reject application"
                : t("Move to {stage}", {
                    stage: target ? t(stageLabel(target)) : t("Stage"),
                  }),
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              target === "REJECTED"
                ? "Rejection is final. The candidate will see your reason."
                : "The candidate will see the new stage. Internal comments remain private to recruiters.",
            )}
          </DialogDescription>
          {form}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={target === "HIRED"}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={restoreFocus}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("stage-cancel")?.focus();
          }}
          className="rounded-panel p-5 shadow-[var(--hv-shadow-overlay)] sm:max-w-[560px]"
        >
          <AlertDialogTitle className="text-[length:var(--hv-text-title)]">
            {t("Hire candidate")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "Hiring is final. The application cannot change stage afterwards.",
            )}
          </AlertDialogDescription>
          {form}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
