"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitApplication } from "@/actions/applications";
import { applySchema, cvValidation } from "@/lib/validation/applications";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { JobButton as Button } from "@/components/jobs/job-button";
type Failure = {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
};
export function ApplyForm({ jobId }: { jobId: string }) {
  const t = useTranslator();
  const router = useRouter();
  const summary = useRef<HTMLDivElement>(null);
  const [coverNote, setCoverNote] = useState("");
  const [file, setFile] = useState<File>();
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  const [phase, setPhase] = useState("Submitting application…");
  const [failure, action, pending] = useActionState<Failure | null, FormData>(
    async () => {
      if (!file)
        return {
          message: "Choose a CV file.",
          errors: { file: ["Choose a CV file."] },
        };
      const invalid = cvValidation(file);
      if (invalid)
        return {
          message: invalid.message,
          errors: { file: [invalid.message] },
        };
      const parsed = applySchema
        .omit({ cvFileId: true })
        .safeParse({ jobId, coverNote });
      if (!parsed.success)
        return {
          message: "Please check your input.",
          errors: parsed.error.flatten().fieldErrors,
        };
      try {
        let fileId =
          uploaded.current?.file === file ? uploaded.current.id : undefined;
        if (!fileId) {
          setPhase("Uploading CV…");
          const body = new FormData();
          body.set("file", file);
          body.set("jobId", jobId);
          const response = await fetch("/api/uploads/cv", {
            method: "POST",
            body,
          });
          const result = await response.json();
          if (!response.ok) {
            if (response.status === 409)
              toast.error(t(result.message), {
                action: {
                  label: t("My applications"),
                  onClick: () => router.push("/applications"),
                },
              });
            return {
              message: result.message ?? "Unable to upload CV.",
              status: response.status,
              errors:
                response.status === 413 || response.status === 415
                  ? { file: [result.message] }
                  : result.errors,
            };
          }
          fileId = result.fileId;
          if (!fileId) throw new Error("Missing file ID");
          uploaded.current = { file, id: fileId };
        }
        setPhase("Submitting application…");
        const result = await submitApplication({
          ...parsed.data,
          cvFileId: fileId,
        });
        if (!result.ok) {
          if (result.status === 409)
            toast.error(t(result.message), {
              action: {
                label: t("My applications"),
                onClick: () => router.push("/applications"),
              },
            });
          return result;
        }
        toast.success(t("Application submitted"));
        router.push("/applications");
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
      className="space-y-4 rounded-panel border border-border-subtle bg-surface p-6"
    >
      {failure && (
        <div
          ref={summary}
          tabIndex={-1}
          role="alert"
          className="rounded-control bg-[var(--hv-danger-tint)] p-3 text-sm text-[var(--hv-danger-ink)]"
        >
          <p>{t(failure.message)}</p>
          {Object.entries(failure.errors ?? {}).map(([field, errors]) => (
            <p key={field}>
              <a
                className="underline"
                href={`#${field === "cvFileId" ? "file" : field}`}
              >
                {t(errors[0])}
              </a>
            </p>
          ))}
          {failure.status === 409 && (
            <Link className="underline" href="/applications">
              {t("My applications")}
            </Link>
          )}
        </div>
      )}
      <div>
        <Label htmlFor="coverNote" className="mb-2">
          {t("Cover note (optional)")}
        </Label>
        <Textarea
          id="coverNote"
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          disabled={pending}
          maxLength={2000}
          rows={6}
          className="shadow-none"
          aria-invalid={Boolean(failure?.errors?.coverNote)}
          aria-describedby="coverNote-help coverNote-error"
        />
        <p id="coverNote-help" className="mt-2 text-xs text-muted-foreground">
          {coverNote.length}
          {t("/2000 characters")}
        </p>
        <p id="coverNote-error" className="text-xs text-[var(--hv-danger-ink)]">
          {t(failure?.errors?.coverNote?.[0])}
        </p>
      </div>
      <div>
        <Label htmlFor="file" className="mb-2">
          {t("CV (required)")}
        </Label>
        <Input
          id="file"
          type="file"
          required
          aria-required="true"
          accept=".pdf,.doc,.docx"
          disabled={pending}
          aria-invalid={Boolean(failure?.errors?.file)}
          aria-describedby="file-help file-error"
          onChange={(e) => setFile(e.target.files?.[0])}
        />
        <p id="file-help" className="mt-2 text-xs text-muted-foreground">
          {t("PDF, DOC, or DOCX, up to 5 MB.")}
          {file &&
            t(" Selected: {name} ({size} KB).", {
              name: file.name,
              size: Math.ceil(file.size / 1024),
            })}
        </p>
        <p id="file-error" className="text-xs text-[var(--hv-danger-ink)]">
          {t(failure?.errors?.file?.[0])}
        </p>
      </div>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          {t(phase)}
        </p>
      )}
      <div className="flex justify-end border-t border-border-subtle pt-4">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {t("Submit application")}
        </Button>
      </div>
    </form>
  );
}
