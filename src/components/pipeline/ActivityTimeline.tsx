"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import Link from "next/link";
import { jobActivityLabels, type ActivityDto } from "@/lib/activity";
import {
  ArrowRightLeft,
  FilePlus,
  MessageSquare,
  BriefcaseBusiness,
} from "lucide-react";
import { stageLabel } from "@/lib/pipeline";
import { formatDateTime } from "@/lib/utils";
type Props = {
  items: (ActivityDto & { link?: { href: string; label: string } })[];
  label?: string;
};
export function ActivityTimeline({
  items,
  label = "Application activity",
}: Props) {
  const t = useTranslator();
  if (!items.length)
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        {t("No activity yet.")}
      </p>
    );
  return (
    <ol aria-label={t(label)} className="mt-4 space-y-4">
      {items.map((item) => {
        const Icon =
          item.type === "APPLICATION_CREATED"
            ? FilePlus
            : item.type === "NOTE_ADDED"
              ? MessageSquare
              : item.type === "STAGE_CHANGED"
                ? ArrowRightLeft
                : BriefcaseBusiness;
        const text =
          item.type === "APPLICATION_CREATED"
            ? "Application submitted"
            : item.type === "NOTE_ADDED"
              ? "Interview note added"
              : item.type !== "STAGE_CHANGED"
                ? jobActivityLabels[item.type]
                : t("Stage changed: {from} → {to}", {
                    from: t(
                      item.from ? stageLabel(item.from) : "Previous stage",
                    ),
                    to: t(item.to ? stageLabel(item.to) : "New stage"),
                  });
        return (
          <li
            key={item.id}
            className="flex gap-2 border-b border-border-subtle pb-4 last:border-0"
          >
            <Icon
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-muted-foreground"
            />
            <div className="min-w-0 text-sm">
              <p>{t(text)}</p>
              {item.link && (
                <Link
                  href={item.link.href}
                  className="break-words text-accent-ink max-sm:inline-flex max-sm:min-h-10 max-sm:items-center"
                >
                  {item.link.label}
                </Link>
              )}
              <p className="text-xs text-muted-foreground">
                {item.actor} ·{" "}
                <time dateTime={item.createdAt}>
                  {formatDateTime(item.createdAt, t.locale)}
                </time>
              </p>
              {item.comment && (
                <p className="mt-2 whitespace-pre-wrap break-words text-ink-body">
                  {item.comment.slice(0, 300)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
