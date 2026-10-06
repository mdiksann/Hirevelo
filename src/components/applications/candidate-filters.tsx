"use client";
import Link from "next/link";
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
import { stages } from "@/lib/validation/applications";
import { stageLabels } from "@/lib/applications";
type Props = {
  q: string;
  jobs: { id: string; title: string }[];
  jobPagination: { page: number; pageSize: number; total: number };
};
export function CandidateFilters({ q, jobs, jobPagination }: Props) {
  const [search, setSearch] = useState(q);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => {
    if (search.trim() === new URLSearchParams(query).get("q")) return;
    if (!search.trim() && !new URLSearchParams(query).has("q")) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(query);
      params.set("q", search.trim());
      params.delete("page");
      startTransition(() => router.replace(`${pathname}?${params}`));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query, router, pathname]);
  function update(key: string, value: string) {
    const params = new URLSearchParams(query);
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    params.set("q", search.trim());
    params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params}`));
  }
  const params = new URLSearchParams(query);
  function jobPageHref(page: number) {
    const next = new URLSearchParams(query);
    next.set("jobPage", String(page));
    return `${pathname}?${next}`;
  }
  return (
    <div aria-busy={pending} className="mb-4 flex flex-wrap items-end gap-4">
      <div>
        <Label htmlFor="candidate-search" className="mb-2">
          Search candidates
        </Label>
        <Input
          id="candidate-search"
          value={search}
          maxLength={120}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {[
        {
          key: "jobId",
          label: "Job",
          options: jobs.map((job) => ({ value: job.id, label: job.title })),
        },
        {
          key: "stage",
          label: "Stage",
          options: stages.map((stage) => ({
            value: stage,
            label: stageLabels[stage],
          })),
        },
      ].map((filter) => (
        <div key={filter.key}>
          <Label htmlFor={`filter-${filter.key}`} className="mb-2">
            {filter.label}
          </Label>
          <Select
            value={params.get(filter.key) ?? "ALL"}
            onValueChange={(value) => update(filter.key, value)}
          >
            <SelectTrigger
              id={`filter-${filter.key}`}
              className="w-40 shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                All {filter.label.toLowerCase()}s
              </SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filter.key === "jobId" &&
            (jobPagination.page > 1 ||
              jobPagination.total > jobPagination.pageSize) && (
              <nav
                aria-label="Job filter options"
                className="mt-2 flex gap-4 text-xs text-accent-ink"
              >
                {jobPagination.page > 1 && (
                  <Link href={jobPageHref(jobPagination.page - 1)}>
                    Previous jobs
                  </Link>
                )}
                {jobPagination.page * jobPagination.pageSize <
                  jobPagination.total && (
                  <Link href={jobPageHref(jobPagination.page + 1)}>
                    More jobs
                  </Link>
                )}
              </nav>
            )}
        </div>
      ))}
      {[
        { key: "dateFrom", label: "Applied from" },
        { key: "dateTo", label: "Applied to" },
      ].map((filter) => (
        <div key={filter.key}>
          <Label htmlFor={filter.key} className="mb-2">
            {filter.label}
          </Label>
          <Input
            id={filter.key}
            type="date"
            value={params.get(filter.key) ?? ""}
            onChange={(e) => update(filter.key, e.target.value)}
          />
        </div>
      ))}
      {pending && (
        <p role="status" className="text-xs text-muted-foreground">
          Updating candidates…
        </p>
      )}
    </div>
  );
}
