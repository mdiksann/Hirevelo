"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { registerCandidate, signInAction } from "@/actions/auth";
import { registerSchema, signInSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Failure = { message: string; errors?: Record<string, string[]> };
export function AuthForm({
  register = false,
  returnTo,
  portal,
}: {
  register?: boolean;
  returnTo?: string;
  portal?: "candidate" | "recruiter";
}) {
  const t = useTranslator();
  const [showPassword, setShowPassword] = useState(false);
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
        {t(
          register
            ? "Register"
            : portal === "recruiter"
              ? "Recruiter sign in"
              : "Sign in",
        )}
      </h1>
      <p className="mb-6 text-[length:var(--hv-text-ui)] text-muted-foreground">
        {t(
          register
            ? "Create a candidate account to apply for jobs and track your applications."
            : portal === "recruiter"
              ? "Sign in with your operator-provided recruiter account to manage hiring."
              : portal === "candidate"
                ? "Sign in to track your applications and hiring progress."
                : "Choose Candidate or Recruiter to access your workspace.",
        )}
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const parsed = (register ? registerSchema : signInSchema).safeParse({
            ...values,
            ...(!register && portal ? { portal } : {}),
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
            <p>{t(failure.message)}</p>
            {Object.entries(failure.errors ?? {}).map(([field, messages]) => (
              <p key={field}>
                <a href={`#${field}`} className="underline">
                  {t(messages[0])}
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
                {t(
                  field === "name"
                    ? "Name"
                    : field === "email"
                      ? "Email"
                      : "Password",
                )}
                <span
                  aria-hidden="true"
                  className="text-[var(--hv-danger-ink)]"
                >
                  *
                </span>
              </Label>
              <div className="relative">
                <Input
                  id={field}
                  name={field}
                  type={
                    field === "password"
                      ? showPassword
                        ? "text"
                        : "password"
                      : field === "name"
                        ? "text"
                        : field
                  }
                  className={field === "password" ? "pr-12" : undefined}
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
                  maxLength={
                    field === "name" ? 80 : field === "email" ? 254 : 72
                  }
                  disabled={pending}
                />
                {field === "password" && (
                  <button
                    type="button"
                    disabled={pending}
                    className="password-toggle"
                    aria-label={t(
                      showPassword ? "Hide password" : "Show password",
                    )}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
              {register && field === "password" && (
                <p
                  id="password-help"
                  className="mt-2 text-[length:var(--hv-text-meta)] text-muted-foreground"
                >
                  {t(
                    "8–72 characters, including a letter and a number; at most 72 bytes.",
                  )}
                </p>
              )}
              {error && (
                <p
                  id={`${field}-error`}
                  className="mt-2 text-[length:var(--hv-text-meta)] text-[var(--hv-danger-ink)]"
                >
                  {t(error)}
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
            {t(
              pending ? (
                <>
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 animate-spin motion-reduce:animate-none"
                  />
                  <span className="sr-only">
                    {t(register ? "Creating account" : "Signing in")}
                  </span>
                </>
              ) : register ? (
                "Create account"
              ) : (
                "Sign in"
              ),
            )}
          </Button>
        </div>
      </form>
      {portal === "candidate" && !register && (
        <p className="mt-4 text-sm">
          <Link href="/recruiter/sign-in" className="text-accent-ink underline">
            {t("Recruiter sign in")}
          </Link>
        </p>
      )}
      {portal === "recruiter" && !register ? (
        <p className="mt-4 text-[length:var(--hv-text-ui)] text-muted-foreground">
          {t(
            "Need a recruiter account? Contact your Hirevelo operator. Recruiter accounts are created by the operator.",
          )}
        </p>
      ) : (
        <p className="mt-4 text-[length:var(--hv-text-ui)] text-muted-foreground">
          {t(register ? "Already have an account? " : "Need an account? ")}
          <Link
            href={
              register
                ? `/sign-in${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
                : `/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
            }
            className="text-accent-ink underline"
          >
            {t(register ? "Sign in" : "Register")}
          </Link>
        </p>
      )}
    </section>
  );
}
