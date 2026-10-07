"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { stages, type Stage } from "@/lib/validation/applications";
import { stageLabels } from "@/lib/applications";
import { cn } from "@/lib/utils";
export function PipelineStepper({ stage }: { stage: Stage }) {
  const t = useTranslator();
  const current = stages.indexOf(stage);
  return (
    <ol
      aria-label={t("Application pipeline")}
      className="flex flex-col gap-4 sm:flex-row sm:flex-wrap"
    >
      {stages
        .filter((value) => value !== "REJECTED" || stage === "REJECTED")
        .map((value, index) => (
          <li
            key={value}
            aria-current={stage === value ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground",
              stage === value && "font-semibold text-ink",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-4 rounded-full border border-border",
                stage !== "REJECTED" && index < current && "bg-accent-ink",
                stage === value &&
                  "bg-[var(--hv-accent)] ring-2 ring-accent-ink ring-offset-2",
                value === "REJECTED" &&
                  "bg-[var(--hv-danger-solid)] ring-[var(--hv-danger-solid)]",
              )}
            />
            {t(stageLabels[value])}
            {stage === value && (
              <span className="sr-only">{t(" (current stage)")}</span>
            )}
          </li>
        ))}
    </ol>
  );
}
