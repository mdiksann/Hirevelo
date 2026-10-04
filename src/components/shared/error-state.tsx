"use client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
type Props = { onRetry: () => void };
export function ErrorState({ onRetry }: Props) {
  return (
    <EmptyState
      title="Something went wrong"
      message="Please try again. If the problem continues, contact support."
      action={
        <Button
          onClick={onRetry}
          className="h-9 rounded-control bg-primary px-3 text-[length:var(--hv-text-ui)] hover:bg-primary-hover"
        >
          Try again
        </Button>
      }
    />
  );
}
