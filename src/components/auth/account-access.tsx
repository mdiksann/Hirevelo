"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";

export function AccountAccess({
  portal,
}: {
  portal: "candidate" | "recruiter";
}) {
  const t = useTranslator();
  const recruiter = portal === "recruiter";
  return (
    <div>
      <section className="space-y-4 rounded-panel border border-border-subtle bg-surface p-6">
        <h1 className="text-[length:var(--hv-text-page)] font-semibold">
          {t(
            recruiter
              ? "Recruiter access required"
              : "Candidate access required",
          )}
        </h1>
        <p className="text-muted-foreground">
          {t(
            recruiter
              ? "You are signed in as a candidate. Recruiter accounts are created by your Hirevelo operator."
              : "You are signed in as a recruiter. Applications belong to candidate accounts.",
          )}
        </p>
        <Link
          href={recruiter ? "/applications" : "/recruiter"}
          className={buttonVariants({ variant: "secondary" })}
        >
          {t(recruiter ? "My applications" : "Recruiter dashboard")}
        </Link>
        <p className="text-muted-foreground">
          {t(
            "To switch accounts, sign out first, then use the appropriate login.",
          )}
        </p>
        <SignOutButton />
        <Link
          className="text-accent-ink underline"
          href={recruiter ? "/recruiter/sign-in" : "/sign-in"}
        >
          {t(recruiter ? "Recruiter sign in" : "Candidate sign in")}
        </Link>
      </section>
    </div>
  );
}
