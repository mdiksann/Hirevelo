"use client";
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${title}`}
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-[10px] shadow-[var(--hv-shadow-overlay)]"
      >
        <DropdownMenuItem asChild>
          <Link href={`/recruiter/jobs/${id}`}>View job</Link>
        </DropdownMenuItem>
        {!archived && (
          <DropdownMenuItem asChild>
            <Link href={`/recruiter/jobs/${id}/edit`}>Edit job</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
