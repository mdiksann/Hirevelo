"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  Users,
  FileText,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Brand } from "@/components/shared/brand";
import {
  LanguageSwitcher,
  useTranslator,
} from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";
export function Navigation({
  role,
  onNavigate,
  recentJobs = [],
}: {
  role: "recruiter" | "candidate";
  onNavigate?: () => void;
  recentJobs?: readonly { id: string; title: string }[];
}) {
  const pathname = usePathname();
  const t = useTranslator();
  const recruiter = role === "recruiter";
  const items = recruiter
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
    <div className="sidebar-content">
      <Brand onClick={onNavigate} />
      <p className="sidebar-role">
        {t(recruiter ? "Recruiter workspace" : "Candidate workspace")}
      </p>
      {recruiter && (
        <Link
          className="sidebar-create"
          href="/recruiter/jobs/new"
          onClick={onNavigate}
        >
          <Plus size={18} aria-hidden="true" />
          {t("New job")}
        </Link>
      )}
      <nav
        aria-label={t(
          recruiter ? "Recruiter navigation" : "Candidate navigation",
        )}
        className="sidebar-nav"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href === "/recruiter" && pathname === "/recruiter/dashboard") ||
            (href !== "/recruiter" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn("sidebar-link", active && "is-active")}
            >
              <Icon size={19} aria-hidden="true" strokeWidth={1.8} />
              {t(label)}
            </Link>
          );
        })}
      </nav>
      {recruiter && (
        <section className="sidebar-jobs">
          <h2>{t("Latest vacancies")}</h2>
          {recentJobs.length ? (
            recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/recruiter/jobs/${job.id}`}
                title={job.title}
                onClick={onNavigate}
                className={cn(
                  "sidebar-job",
                  pathname === `/recruiter/jobs/${job.id}` && "is-active",
                )}
              >
                <span aria-hidden="true" className="sidebar-job-dot" />
                <span>{job.title}</span>
              </Link>
            ))
          ) : (
            <p>{t("No recent jobs")}</p>
          )}
        </section>
      )}
      <div className="sidebar-bottom">
        <Link
          href="/careers"
          onClick={onNavigate}
          className="sidebar-public-link"
        >
          {t("Browse careers")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <div className="sidebar-account">
          <SignOutButton />
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
