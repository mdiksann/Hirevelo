import Link from "next/link";
import type { ReactNode } from "react";
type Props = { children: ReactNode };
export default function Layout({ children }: Props) {
  return (
    <main className="mx-auto max-w-100 p-6">
      <header className="mb-6">
        <Link
          href="/"
          className="text-[length:var(--hv-text-section)] font-semibold tracking-[0.14em]"
        >
          HIREVELO
        </Link>
        <nav
          aria-label="Account navigation"
          className="mt-4 flex gap-4 text-[length:var(--hv-text-ui)]"
        >
          <Link href="/sign-in">Sign in</Link>
          <Link href="/register">Register</Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
