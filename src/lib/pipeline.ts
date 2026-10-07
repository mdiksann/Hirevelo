import { stages, type Stage } from "@/lib/validation/applications";
import { stageLabels, stageStyles } from "@/lib/applications";
export const STAGES = stages;
export const ACTIVE_STAGES = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFERING",
] as const;
export const TERMINAL_STAGES = ["HIRED", "REJECTED"] as const;
export const stageLabel = (stage: Stage) => stageLabels[stage];
export const stageOrder = (stage: Stage) => STAGES.indexOf(stage);
export const stageTone = (stage: Stage) => stageStyles[stage];
export const isNoopTransition = (from: Stage, to: Stage) => from === to;
export function canTransition(from: Stage, to: Stage) {
  return from !== "HIRED" && from !== "REJECTED" && !isNoopTransition(from, to);
}
export function validateTransition(
  from: Stage,
  to: Stage,
  opts: { jobArchived: boolean },
): { ok: true } | { ok: false; message: string } {
  if (opts.jobArchived)
    return { ok: false, message: "Archived jobs are read-only." };
  if (isNoopTransition(from, to))
    return { ok: false, message: "The application is already at this stage." };
  if (!canTransition(from, to))
    return {
      ok: false,
      message: "Hired and rejected applications cannot change stage.",
    };
  return { ok: true };
}
