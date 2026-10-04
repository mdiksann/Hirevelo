import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
export default function NotFound() {
  return (
    <main className="p-6">
      <h1 className="text-[length:var(--hv-text-page)] font-semibold">
        Page not found
      </h1>
      <EmptyState
        title="This page is unavailable"
        message="Check the address or return to the dashboard."
        action={
          <Link
            href="/recruiter"
            className="inline-flex h-9 items-center rounded-control border border-border bg-surface px-3 text-[length:var(--hv-text-ui)]"
          >
            Back to dashboard
          </Link>
        }
      />
    </main>
  );
}
