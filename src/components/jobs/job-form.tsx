"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createJob, updateJob } from "@/actions/jobs";
import { jobCreateSchema, employmentTypes } from "@/lib/validation/jobs";
import { employmentLabels } from "@/lib/jobs";
import type { RecruiterJobDto } from "@/lib/queries/jobs";
import { JobButton as Button } from "@/components/jobs/job-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Failure = { message: string; errors?: Record<string, string[]> };
const fields = [
  { name: "title", label: "Title", max: 120 },
  { name: "description", label: "Description", max: 20_000 },
  { name: "location", label: "Location", max: 120 },
  { name: "salaryMin", label: "Salary minimum" },
  { name: "salaryMax", label: "Salary maximum" },
] as const;
export function JobForm({ job }: { job?: RecruiterJobDto }) {
  const router = useRouter();
  const summary = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState({
    title: job?.title ?? "",
    description: job?.description ?? "",
    location: job?.location ?? "",
    salaryMin: String(job?.salaryMin ?? ""),
    salaryMax: String(job?.salaryMax ?? ""),
  });
  const [employmentType, setEmploymentType] = useState(
    job?.employmentType ?? "FULL_TIME",
  );
  const [failure, action, pending] = useActionState<Failure | null, FormData>(
    async (_, data) => {
      const values = Object.fromEntries(data);
      const parsed = jobCreateSchema.safeParse(values);
      if (!parsed.success)
        return {
          message: "Please check your input.",
          errors: parsed.error.flatten().fieldErrors,
        };
      try {
        const result = job
          ? await updateJob({ ...parsed.data, id: job.id })
          : await createJob(parsed.data);
        if (!result.ok) return result;
        toast.success(job ? "Job updated" : "Draft created");
        router.push(`/recruiter/jobs/${result.data.id}`);
        return null;
      } catch {
        return { message: "Unable to connect. Please try again." };
      }
    },
    null,
  );
  useEffect(() => {
    if (failure) summary.current?.focus();
  }, [failure]);
  return (
    <form
      action={action}
      noValidate
      aria-busy={pending}
      className="rounded-panel border border-border-subtle bg-surface p-6 space-y-4"
    >
      {failure && (
        <div
          ref={summary}
          role="alert"
          tabIndex={-1}
          className="rounded-control bg-[var(--hv-danger-tint)] p-3 text-sm text-[var(--hv-danger-ink)]"
        >
          <p>{failure.message}</p>
          {Object.entries(failure.errors ?? {}).map(([field, messages]) => (
            <p key={field}>
              <a href={`#${field}`} className="underline">
                {messages[0]}
              </a>
            </p>
          ))}
        </div>
      )}
      <h2 className="text-[length:var(--hv-text-title)] font-semibold">
        Basics
      </h2>
      {fields.map((field) => {
        const salary = field.name === "salaryMin" || field.name === "salaryMax";
        const error = failure?.errors?.[field.name]?.[0];
        const attributes = {
          id: field.name,
          name: field.name,
          value: values[field.name],
          onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => setValues({ ...values, [field.name]: event.target.value }),
          disabled: pending,
          required: !salary,
          "aria-required": !salary,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? `${field.name}-error` : undefined,
        };
        return (
          <div
            key={field.name}
            className={
              field.name === "salaryMin"
                ? "border-t border-border-subtle pt-4"
                : undefined
            }
          >
            {field.name === "salaryMin" && (
              <h2 className="mb-4 text-[length:var(--hv-text-title)] font-semibold">
                Compensation
              </h2>
            )}
            <Label htmlFor={field.name} className="mb-2">
              {field.label}
              {!salary && (
                <span
                  aria-hidden="true"
                  className="text-[var(--hv-danger-ink)]"
                >
                  *
                </span>
              )}
            </Label>
            {field.name === "description" ? (
              <Textarea
                {...attributes}
                className="shadow-none"
                rows={8}
                maxLength={field.max}
              />
            ) : (
              <Input
                {...attributes}
                className="shadow-none"
                type={salary ? "number" : "text"}
                maxLength={"max" in field ? field.max : undefined}
                min={salary ? 1 : undefined}
                max={salary ? 10_000_000 : undefined}
                step={salary ? 1 : undefined}
              />
            )}
            {field.name === "location" && (
              <div className="mt-4">
                <Label htmlFor="employmentType" className="mb-2">
                  Employment type
                  <span
                    aria-hidden="true"
                    className="text-[var(--hv-danger-ink)]"
                  >
                    *
                  </span>
                </Label>
                <Select
                  name="employmentType"
                  value={employmentType}
                  onValueChange={(value) => {
                    if (
                      employmentTypes.includes(value as typeof employmentType)
                    )
                      setEmploymentType(value as typeof employmentType);
                  }}
                  disabled={pending}
                >
                  <SelectTrigger
                    id="employmentType"
                    aria-required="true"
                    aria-invalid={Boolean(failure?.errors?.employmentType)}
                    aria-describedby={
                      failure?.errors?.employmentType
                        ? "employmentType-error"
                        : undefined
                    }
                    className="w-full shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {employmentLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {failure?.errors?.employmentType && (
                  <p
                    id="employmentType-error"
                    className="mt-2 text-xs text-[var(--hv-danger-ink)]"
                  >
                    {failure.errors.employmentType[0]}
                  </p>
                )}
              </div>
            )}
            {error && (
              <p
                id={`${field.name}-error`}
                className="mt-2 text-xs text-[var(--hv-danger-ink)]"
              >
                {error}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex justify-end border-t border-border-subtle pt-4">
        <Button
          disabled={pending}
          aria-busy={pending}
          type="submit"
          className="min-w-32"
        >
          {pending ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 animate-spin motion-reduce:animate-none"
              />
              <span className="sr-only">Saving job</span>
            </>
          ) : job ? (
            "Save changes"
          ) : (
            "Save as draft"
          )}
        </Button>
      </div>
    </form>
  );
}
