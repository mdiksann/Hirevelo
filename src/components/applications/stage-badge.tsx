import { Badge } from "@/components/ui/badge";
import { stageLabels, stageStyles } from "@/lib/applications";
import type { Stage } from "@/lib/validation/applications";
export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge className={`h-[22px] px-[9px] font-semibold ${stageStyles[stage]}`}>
      {stageLabels[stage]}
    </Badge>
  );
}
