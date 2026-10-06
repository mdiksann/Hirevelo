"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { registerCandidate, signInAction } from "@/actions/auth";
import { registerSchema, signInSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Failure = { message: string; errors?: Record<string, string[]> };
export function AuthForm({
  register = false,
  returnTo,
}: {
  register?: boolean;
  returnTo?: string;
}) {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [failure, setFailure] = useState<Failure>();
  const [pending, startTransition] = useTransition();
  const summary = useRef<HTMLDivElement>(null);
  const fields = register
    ? (["name", "email", "password"] as const)
    : (["email", "password"] as const);
  function showFailure(next: Failure) {
    setFailure(next);
    requestAnimationFrame(() => summary.current?.focus());
  }
  return (
    <section className="rounded-panel border border-border-subtle bg-surface p-6">
      <h1 className="mb-4 text-[length:var(--hv-text-page)] font-semibold text-ink">
        {register ? "Register" : "Sign in"}
      </h1>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const parsed = (register ? registerSchema : signInSchema).safeParse({
            ...values,
            ...(returnTo ? { returnTo } : {}),
          });
          if (!parsed.success) {
            showFailure({
              message: "Please check your input.",
              errors: Object.fromEntries(
                parsed.error.issues.map((issue) => [
                  issue.path.join("."),
                  [issue.message],
                ]),
              ),
            });
            return;
          }
          setFailure(undefined);
          startTransition(async () => {
            try {
              const result = await (
                register ? registerCandidate : signInAction
              )(parsed.data);
              if (!result.ok) showFailure(result);
            } catch {
              showFailure({ message: "Unable to connect. Please try again." });
            }
          });
        }}
        className="space-y-4"
        aria-busy={pending}
      >
        {failure && (
          <div
            ref={summary}
            tabIndex={-1}
            role="alert"
            className="rounded-control bg-[var(--hv-danger-tint)] p-3 text-[length:var(--hv-text-ui)] text-[var(--hv-danger-ink)]"
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
        {fields.map((field) => {
          const error = failure?.errors?.[field]?.[0];
          return (
            <div key={field}>
              <Label
                htmlFor={field}
                className="mb-2 text-[length:var(--hv-text-ui)]"
              >
                {field === "name"
                  ? "Name"
                  : field === "email"
                    ? "Email"
                    : "Password"}
                <span
                  aria-hidden="true"
                  className="text-[var(--hv-danger-ink)]"
                >
                  *
                </span>
              </Label>
              <Input
                id={field}
                name={field}
                type={field === "name" ? "text" : field}
                autoComplete={
                  field === "password"
                    ? register
                      ? "new-password"
                      : "current-password"
                    : field
                }
                required
                aria-required="true"
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error
                    ? `${field}-error`
                    : register && field === "password"
                      ? "password-help"
                      : undefined
                }
                value={values[field]}
                onChange={(event) =>
                  setValues({ ...values, [field]: event.target.value })
                }
                maxLength={field === "name" ? 80 : field === "email" ? 254 : 72}
                disabled={pending}
              />
              {register && field === "password" && (
                <p
                  id="password-help"
                  className="mt-2 text-[length:var(--hv-text-meta)] text-muted-foreground"
                >
                  8–72 characters, including a letter and a number; at most 72
                  bytes.
                </p>
              )}
              {error && (
                <p
                  id={`${field}-error`}
                  className="mt-2 text-[length:var(--hv-text-meta)] text-[var(--hv-danger-ink)]"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}
        <div className="flex justify-end border-t border-border-subtle pt-4">
          <Button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="min-w-32"
          >
            {pending ? (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                />
                <span className="sr-only">
                  {register ? "Creating account" : "Signing in"}
                </span>
              </>
            ) : register ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </div>
      </form>
      <p className="mt-4 text-[length:var(--hv-text-ui)] text-muted-foreground">
        {register ? "Already have an account? " : "Need an account? "}
        <Link
          href={`${register ? "/sign-in" : "/register"}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="text-accent-ink underline"
        >
          {register ? "Sign in" : "Register"}
        </Link>
      </p>
    </section>
  );
}
