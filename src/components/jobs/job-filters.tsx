"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jobStatuses } from "@/lib/validation/jobs";
import { jobStatusLabels } from "@/lib/jobs";
export function JobFilters({
  q,
  status,
  recruiter = false,
}: {
  q: string;
  status?: string;
  recruiter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(q);
  const [pending, startTransition] = useTransition();
  const query = searchParams.toString();
  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(query);
      params.set("q", search.trim());
      params.delete("page");
      startTransition(() => router.replace(`${pathname}?${params}`));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, q, query, router, pathname]);
  return (
    <div className="mb-4 flex flex-wrap items-end gap-4" aria-busy={pending}>
      <div className="w-full sm:w-60">
        <Label htmlFor="job-search" className="mb-2">
          Search jobs
        </Label>
        <Input
          className="shadow-none"
          id="job-search"
          type="search"
          value={search}
          maxLength={120}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {recruiter && (
        <div>
          <Label htmlFor="job-status" className="mb-2">
            Status
          </Label>
          <Select
            value={status ?? "ALL"}
            onValueChange={(value) => {
              const params = new URLSearchParams(query);
              if (value === "ALL") params.delete("status");
              else params.set("status", value);
              params.delete("page");
              startTransition(() => router.replace(`${pathname}?${params}`));
            }}
          >
            <SelectTrigger id="job-status" className="w-40 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {jobStatuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {jobStatusLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {pending && (
        <p role="status" className="text-xs text-muted-foreground">
          Updating jobs…
        </p>
      )}
    </div>
  );
}
