"use client";
import { ErrorState } from "@/components/shared/error-state";
type Props = { error: Error & { digest?: string }; reset: () => void };
export default function ErrorPage({ reset }: Props) {
  return (
    <main className="p-6">
      <h1 className="text-[length:var(--hv-text-page)] font-semibold">
        Unable to load this page
      </h1>
      <ErrorState onRetry={reset} />
    </main>
  );
}
