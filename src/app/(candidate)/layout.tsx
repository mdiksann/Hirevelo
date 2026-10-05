import type { ReactNode } from "react";
import { AppShell } from "@/components/shared/app-shell";
import { requireCandidate } from "@/lib/auth-helpers";
import { AuthError, ForbiddenError } from "@/lib/errors";
import { notFound, redirect } from "next/navigation";
type Props = { children: ReactNode };
export default async function Layout({ children }: Props) {
  try {
    await requireCandidate();
  } catch (error) {
    if (error instanceof AuthError) redirect("/sign-in");
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }
  return <AppShell role="candidate">{children}</AppShell>;
}
