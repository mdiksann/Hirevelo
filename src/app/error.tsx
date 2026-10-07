"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import { ErrorState } from "@/components/shared/error-state";
type Props = { error: Error & { digest?: string }; reset: () => void };
export default function ErrorPage({ reset }: Props) {
  const t = useTranslator();
  return (
    <main className="p-6">
      <h1 className="text-[length:var(--hv-text-page)] font-semibold">
        {t("Unable to load this page")}
      </h1>
      <ErrorState onRetry={reset} />
    </main>
  );
}
