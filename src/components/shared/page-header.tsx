import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  tabs?: readonly { label: string; href: string; active?: boolean }[];
};
export function PageHeader({ title, description, actions, tabs }: Props) {
  return (
    <header className="mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--hv-text-page)] leading-[var(--hv-leading-page)] font-semibold">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-[length:var(--hv-text-meta)] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>
      {tabs && (
        <nav
          aria-label={`${title} views`}
          className="mt-4 flex h-10 gap-5 border-b border-border-subtle"
        >
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center text-[length:var(--hv-text-ui)] font-medium text-muted-foreground hover:text-ink-body",
                tab.active && "border-b-2 border-primary text-accent-ink",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
