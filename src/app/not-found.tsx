"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
export default function NotFound() {
  const t = useTranslator();
  return (
    <main className="p-6">
      <h1 className="text-[length:var(--hv-text-page)] font-semibold">
        {t("Page not found")}
      </h1>
      <EmptyState
        title={t("This page is unavailable")}
        message={t("Check the address or return to the dashboard.")}
        action={
          <Link
            href="/recruiter"
            className="inline-flex h-9 items-center rounded-control border border-border bg-surface px-3 text-[length:var(--hv-text-ui)]"
          >
            {t("Back to dashboard")}
          </Link>
        }
      />
    </main>
  );
}
