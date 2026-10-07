import {
  BriefcaseBusiness,
  FileText,
  UserRound,
  MessagesSquare,
  CheckCheck,
} from "lucide-react";

const flatIcons = {
  briefcase: BriefcaseBusiness,
  document: FileText,
  candidate: UserRound,
  conversation: MessagesSquare,
  decision: CheckCheck,
};

export type HomeIconName =
  "briefcase" | "document" | "candidate" | "conversation" | "decision";

export function HomeIcon({
  name,
  size = 48,
  className,
}: {
  name: HomeIconName;
  size?: number;
  className?: string;
}) {
  const Icon = flatIcons[name];
  return (
    <Icon
      size={Math.min(size, 28)}
      strokeWidth={1.75}
      className={["home-icon", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    />
  );
}
