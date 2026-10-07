"use client";
import { useTranslator } from "@/components/i18n/language-provider";
import type { ReactNode } from "react";
type Props = { title: string; message: string; action?: ReactNode };
export function EmptyState({ title, message, action }: Props) {
  const t = useTranslator();
  return (
    <div className="mx-auto max-w-80 py-12 text-center">
      <h2 className="text-[length:var(--hv-text-body)] font-semibold">
        {t(title)}
      </h2>
      <p className="mt-2 text-[length:var(--hv-text-ui)] text-muted-foreground">
        {t(message)}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
