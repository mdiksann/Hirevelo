"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
type Props = { onRetry: () => void };
export function ErrorState({ onRetry }: Props) {
  const t = useTranslator();
  return (
    <EmptyState
      title={t("Something went wrong")}
      message={t(
        "Please try again. If the problem continues, contact support.",
      )}
      action={
        <Button
          onClick={onRetry}
          className="h-9 rounded-control bg-primary px-3 text-[length:var(--hv-text-ui)] hover:bg-primary-hover"
        >
          {t("Try again")}
        </Button>
      }
    />
  );
}
