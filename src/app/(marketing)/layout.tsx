import Link from "next/link";
import type { ReactNode } from "react";
type Props = { children: ReactNode };
export default function Layout({ children }: Props) {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border-subtle bg-surface p-4">
        <Link
          href="/"
          className="text-[length:var(--hv-text-section)] font-semibold tracking-[0.14em]"
        >
          HIREVELO
        </Link>
        <nav
          aria-label="Public navigation"
          className="flex gap-4 text-[length:var(--hv-text-ui)]"
        >
          <Link href="/careers">Careers</Link>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/register">Register</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
