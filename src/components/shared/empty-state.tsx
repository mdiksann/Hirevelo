import type { ReactNode } from "react";
type Props = { title: string; message: string; action?: ReactNode };
export function EmptyState({ title, message, action }: Props) {
  return (
    <div className="mx-auto max-w-80 py-12 text-center">
      <h2 className="text-[length:var(--hv-text-body)] font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-[length:var(--hv-text-ui)] text-muted-foreground">
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
