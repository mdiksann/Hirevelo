"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
export default function Error({ reset }: { reset: () => void }) {
  const t = useTranslator();
  return (
    <>
      <PageHeader title={t("Unable to load dashboard")} />
      <ErrorState onRetry={reset} />
    </>
  );
}
