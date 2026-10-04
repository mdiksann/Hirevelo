import type { ReactNode } from "react";
import { AppShell } from "@/components/shared/app-shell";
import { redirect } from "next/navigation";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { getSession } from "@/lib/session-stub";
type Props = { children: ReactNode };
export default async function Layout({ children }: Props) {
  const session = await getSession();
  if (!session || session.user.role !== "RECRUITER") redirect("/sign-in");
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
