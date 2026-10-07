"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { addNote } from "@/actions/pipeline";
import { noteSchema } from "@/lib/validation/pipeline";
import { JobButton as Button } from "@/components/jobs/job-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export function NoteComposer({
  applicationId,
  archived,
}: {
  applicationId: string;
  archived: boolean;
}) {
  const t = useTranslator();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  if (archived)
    return (
      <p className="text-sm text-muted-foreground">
        {t("Archived jobs are read-only.")}
      </p>
    );
  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const input = { applicationId, body };
        const parsed = noteSchema.safeParse(input);
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message);
          return;
        }
        setError(undefined);
        startTransition(async () => {
          try {
            const result = await addNote(parsed.data);
            if (!result.ok) {
              setError(result.errors?.body?.[0] ?? result.message);
              toast.error(t(result.message));
              return;
            }
            setBody("");
            toast.success(t("Interview note added"));
          } catch {
            setError("Unable to connect. Please try again.");
            toast.error(t("Unable to connect. Please try again."));
          }
        });
      }}
    >
      <Label htmlFor="note-body">{t("Interview note (required)")}</Label>
      <Textarea
        id="note-body"
        value={body}
        maxLength={2000}
        disabled={pending}
        aria-required="true"
        aria-invalid={!!error}
        aria-describedby={error ? "note-error" : undefined}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && (
        <p
          id="note-error"
          role="alert"
          className="text-sm text-[var(--hv-danger-ink)]"
        >
          {t(error)}
        </p>
      )}
      <Button disabled={pending} aria-busy={pending} type="submit">
        {pending && (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
        {t(pending ? "Adding note…" : "Add note")}
      </Button>
    </form>
  );
}
