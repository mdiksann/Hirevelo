"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  Users,
  FileText,
  Plus,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

type Props = {
  role: "recruiter" | "candidate";
  onNavigate?: () => void;
  recentJobs?: readonly { id: string; title: string }[];
};
export function Navigation({ role, onNavigate, recentJobs = [] }: Props) {
  const pathname = usePathname();
  const items =
    role === "recruiter"
      ? [
          { label: "Dashboard", href: "/recruiter", icon: LayoutDashboard },
          { label: "Jobs", href: "/recruiter/jobs", icon: BriefcaseBusiness },
          { label: "Candidates", href: "/recruiter/candidates", icon: Users },
        ]
      : [
          { label: "Careers", href: "/careers", icon: BriefcaseBusiness },
          { label: "My applications", href: "/applications", icon: FileText },
        ];
  return (
    <>
      <div className="mb-4 flex items-center justify-between px-2">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 text-[length:var(--hv-text-section)] font-semibold tracking-[0.14em]"
        >
          <BriefcaseBusiness
            aria-hidden="true"
            className="size-4.5 text-accent-ink"
            strokeWidth={1.75}
          />
          HIREVELO
        </Link>
        {role === "recruiter" && (
          <Link
            href="/recruiter/jobs/new"
            onClick={onNavigate}
            aria-label="New job"
            className="flex size-7 items-center justify-center rounded-control bg-primary text-primary-foreground max-sm:size-10"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        )}
      </div>
      <nav
        aria-label={
          role === "recruiter" ? "Recruiter navigation" : "Candidate navigation"
        }
        className="grid gap-1"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/recruiter" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2 rounded-control px-3 text-[length:var(--hv-text-ui)] font-medium text-ink-body hover:bg-surface-subtle max-sm:h-10",
                active &&
                  "bg-[var(--hv-surface-active)] font-semibold text-ink",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-4 text-[var(--hv-icon)]",
                  active && "text-accent-ink",
                )}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
        <SignOutButton />
      </nav>
      {role === "recruiter" && (
        <section className="mt-5 px-3">
          <h2 className="mb-2 text-[length:var(--hv-text-section)] font-medium tracking-[0.08em] text-subtle">
            JOBS
          </h2>
          {recentJobs.length ? (
            recentJobs.map((job) => (
              <Link
                key={job.id}
                href="/recruiter/jobs"
                title={job.title}
                onClick={onNavigate}
                className="flex h-9 items-center gap-2 rounded-control text-[length:var(--hv-text-ui)] text-ink-body"
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-[var(--hv-success-ink)]"
                />
                <span className="truncate">{job.title}</span>
              </Link>
            ))
          ) : (
            <p className="text-[length:var(--hv-text-meta)] text-muted-foreground">
              No recent jobs
            </p>
          )}
        </section>
      )}
    </>
  );
}
