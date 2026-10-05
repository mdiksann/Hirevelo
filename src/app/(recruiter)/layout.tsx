import type { ReactNode } from "react";
import { AppShell } from "@/components/shared/app-shell";
import { notFound, redirect } from "next/navigation";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { requireRecruiter } from "@/lib/auth-helpers";
import { AuthError, ForbiddenError } from "@/lib/errors";
type Props = { children: ReactNode };
export default async function Layout({ children }: Props) {
  try {
    await requireRecruiter();
  } catch (error) {
    if (error instanceof AuthError) redirect("/sign-in");
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }
  const jobs = await getPublishedJobs({ pageSize: 3 });
  return (
    <AppShell
      role="recruiter"
      recentJobs={jobs.items.map(({ id, title }) => ({ id, title }))}
    >
      {children}
    </AppShell>
  );
}
