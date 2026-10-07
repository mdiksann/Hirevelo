"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { JobButton as Button } from "@/components/jobs/job-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
export function JobRowActions({
  id,
  title,
  archived,
}: {
  id: string;
  title: string;
  archived: boolean;
}) {
  const t = useTranslator();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("Actions for {title}", { title })}
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-[10px] shadow-[var(--hv-shadow-overlay)]"
      >
        <DropdownMenuItem asChild>
          <Link href={`/recruiter/jobs/${id}`}>{t("View job")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/recruiter/candidates?jobId=${id}`}>
            {t("View applicants")}
          </Link>
        </DropdownMenuItem>
        {!archived && (
          <DropdownMenuItem asChild>
            <Link href={`/recruiter/jobs/${id}/edit`}>{t("Edit job")}</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
