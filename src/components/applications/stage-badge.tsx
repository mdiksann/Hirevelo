"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { Badge } from "@/components/ui/badge";
import { stageLabels, stageStyles } from "@/lib/applications";
import type { Stage } from "@/lib/validation/applications";
export function StageBadge({ stage }: { stage: Stage }) {
  const t = useTranslator();
  return (
    <Badge className={`h-[22px] px-[9px] font-semibold ${stageStyles[stage]}`}>
      {t(stageLabels[stage])}
    </Badge>
  );
}
