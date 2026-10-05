"use client";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        aria-busy={pending}
        className="w-full justify-start"
        onClick={() => {
          setError("");
          startTransition(async () => {
            try {
              const result = await signOutAction();
              if (!result.ok) setError(result.message);
            } catch {
              setError("Unable to sign out. Please try again.");
            }
          });
        }}
      >
        {pending ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="size-3.5 animate-spin motion-reduce:animate-none"
            />
            <span className="sr-only">Signing out</span>
          </>
        ) : (
          "Sign out"
        )}
      </Button>
      {error && (
        <p
          role="alert"
          className="p-3 text-[length:var(--hv-text-meta)] text-[var(--hv-danger-ink)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
