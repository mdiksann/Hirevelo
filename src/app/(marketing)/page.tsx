import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonRows } from "@/components/shared/skeleton-rows";
import { JobButton as Button } from "@/components/jobs/job-button";
import { ChevronDown } from "lucide-react";
import { HomeIcon } from "@/components/marketing/home-icon";
import {
  HeroVisual,
  PipelineVisual,
  WorkflowVisual,
} from "@/components/marketing/home-visuals";

import "@/styles/home.css";
import { PublicJobCard } from "@/components/jobs/public-job-card";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

const benefits = [
  {
    title: "Publish your vacancies",
    icon: "briefcase" as const,
    description:
      "Prepare a draft, review the details, and publish a role on your careers page.",
  },
  {
    title: "Keep decisions together",
    icon: "conversation" as const,
    description:
      "Review CVs, add interview notes, and follow stage changes in one activity history.",
  },
  {
    title: "Give candidates visibility",
    icon: "candidate" as const,
    description:
      "Candidates can check their application stage from their own account.",
  },
];

const workflow = [
  {
    title: "Publish a role",
    description:
      "Add the job description, location, and employment details. Publish when the vacancy is ready for applications.",
  },
  {
    title: "Review applications",
    description:
      "Read each candidate’s CV and cover note. Move applications through screening and interview, recording notes as you go.",
  },
  {
    title: "Record the decision",
    description:
      "Move successful candidates to offering and hired, or record a rejection reason. Each stage change stays in the activity history.",
  },
];

const questions = [
  {
    question: "How do I apply for a vacancy?",
    answer:
      "Open a job on the careers page, create a candidate account or sign in, and submit your CV with an optional cover note. You can apply once to each vacancy.",
  },
  {
    question: "Can I check my application status?",
    answer:
      "Yes. Sign in and open My applications to see your current stage and application history. If an application is rejected, you can also read the reason.",
  },
  {
    question: "How do recruiters access Hirevelo?",
    answer:
      "Recruiter accounts are set up by the system operator. Sign in with your recruiter account to manage vacancies and review candidates. Self-service registration creates a candidate account.",
  },
  {
    question: "What happens when a vacancy closes?",
    answer:
      "The vacancy stops accepting new applications. Recruiters can continue reviewing applications that were already submitted.",
  },
];

export default async function Page() {
  const t = await getTranslator();
  const session = await auth();
  const recruiter = session?.user.role === "RECRUITER";
  return (
    <div className="hirevelo-home space-y-12">
      <ScrollReveal />
      <div className="home-hero grid items-center gap-8 py-8 lg:grid-cols-2">
        <section aria-label={t("Getting started")} className="space-y-6">
          <h1 className="max-w-sm text-[length:var(--hv-text-metric)] leading-8 font-semibold">
            {t("A better way to hire, together.")}
          </h1>
          <p className="max-w-prose text-[length:var(--hv-text-body)] leading-[var(--hv-leading-body)] text-ink-body">
            {t(
              "From a new opportunity to a new teammate. Keep every application, conversation, and decision in view.",
            )}
          </p>
          <p className="text-[length:var(--hv-text-meta)] text-muted-foreground">
            {t(
              recruiter
                ? "Your recruiter workspace is ready."
                : session
                  ? "Follow your applications or find your next role."
                  : "Looking for your next role? Browse vacancies and apply with your CV.",
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link
                href={
                  recruiter
                    ? "/recruiter"
                    : session
                      ? "/applications"
                      : "/careers"
                }
              >
                {t(
                  recruiter
                    ? "Open dashboard"
                    : session
                      ? "My applications"
                      : "Browse jobs",
                )}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={
                  recruiter
                    ? "/recruiter/jobs"
                    : session
                      ? "/careers"
                      : "/register"
                }
              >
                {t(
                  recruiter
                    ? "Manage jobs"
                    : session
                      ? "Browse jobs"
                      : "Create candidate account",
                )}
              </Link>
            </Button>
            {recruiter && (
              <Button asChild variant="outline">
                <Link href="/recruiter/candidates">
                  {t("Review candidates")}
                </Link>
              </Button>
            )}
          </div>
        </section>
        <HeroVisual />
      </div>

      <section
        aria-label={t("What you can do with Hirevelo")}
        className="home-benefits grid gap-4 md:grid-cols-3"
      >
        {benefits.map((benefit) => (
          <div
            key={benefit.title}
            className="home-benefit space-y-3 rounded-panel bg-surface-subtle p-6"
          >
            <HomeIcon
              name={benefit.icon}
              className="home-benefit-icon"
              size={72}
            />
            <h2 className="text-[length:var(--hv-text-title)] font-semibold">
              {t(benefit.title)}
            </h2>
            <p className="text-[length:var(--hv-text-body)] leading-[var(--hv-leading-body)] text-muted-foreground">
              {t(benefit.description)}
            </p>
          </div>
        ))}
      </section>

      <section
        aria-labelledby="pipeline-overview"
        className="home-showcase space-y-6 rounded-panel bg-surface-subtle p-6 text-center"
      >
        <div className="space-y-2">
          <h2
            id="pipeline-overview"
            className="text-[length:var(--hv-text-page)] font-semibold"
          >
            {t("Every application has a clear next step")}
          </h2>
          <p className="text-[length:var(--hv-text-body)] text-muted-foreground">
            {t("A shared pipeline keeps recruiters and candidates informed.")}
          </p>
        </div>
        <PipelineVisual />
        <p className="text-[length:var(--hv-text-meta)] text-muted-foreground">
          {t(
            "Stage changes are recorded in the application’s activity history.",
          )}
        </p>
      </section>

      <section
        aria-labelledby="hiring-workflow"
        className="home-workflow space-y-8"
      >
        <div className="space-y-2 text-center">
          <h2
            id="hiring-workflow"
            className="text-[length:var(--hv-text-page)] font-semibold"
          >
            {t("A clear path through the hiring process")}
          </h2>
          <p className="text-[length:var(--hv-text-body)] text-muted-foreground">
            {t("Keep applications and decisions connected at every stage.")}
          </p>
        </div>
        <ol className="space-y-8">
          {workflow.map((step, index) => (
            <li
              key={step.title}
              className="grid items-center gap-8 md:grid-cols-2"
            >
              <div className={index === 1 ? "md:order-2" : ""}>
                <WorkflowVisual step={index} />
              </div>
              <div className="space-y-3">
                <h3 className="text-[length:var(--hv-text-title)] font-semibold">
                  {index + 1}. {t(step.title)}
                </h3>
                <p className="max-w-prose text-[length:var(--hv-text-body)] leading-[var(--hv-leading-body)] text-ink-body">
                  {t(step.description)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="candidate-start"
        className="flex flex-wrap items-center justify-between gap-4 rounded-panel bg-accent-soft p-6"
      >
        <div className="space-y-2">
          <h2
            id="candidate-start"
            className="text-[length:var(--hv-text-title)] font-semibold"
          >
            {t("Find your next role. Follow your progress.")}
          </h2>
          <p className="max-w-prose text-[length:var(--hv-text-body)] text-muted-foreground">
            {t(
              "Browse open vacancies and check your application status when you sign in.",
            )}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/careers">{t("Explore vacancies")}</Link>
        </Button>
      </section>

      <section aria-labelledby="latest-vacancies" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2
            id="latest-vacancies"
            className="text-[length:var(--hv-text-page)] font-semibold"
          >
            {t("Latest vacancies")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/careers">{t("View all jobs")}</Link>
          </Button>
        </div>
        <div className="overflow-hidden rounded-panel border border-border-subtle">
          <Suspense fallback={<SkeletonRows />}>
            <LatestJobs />
          </Suspense>
        </div>
      </section>

      <section
        aria-labelledby="questions"
        className="home-faq space-y-6 rounded-panel bg-surface-subtle p-6"
      >
        <h2
          id="questions"
          className="text-center text-[length:var(--hv-text-page)] font-semibold"
        >
          {t("Questions about Hirevelo")}
        </h2>
        <div className="mx-auto max-w-2xl space-y-2">
          {questions.map(({ question, answer }) => (
            <details
              key={question}
              className="overflow-hidden rounded-control border border-border-subtle bg-surface"
            >
              <summary className="cursor-pointer px-6 py-4 text-[length:var(--hv-text-ui)] font-medium hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-ink">
                {t(question)}
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p className="max-w-prose px-6 pb-4 text-[length:var(--hv-text-body)] leading-[var(--hv-leading-body)] text-muted-foreground">
                {t(answer)}
              </p>
            </details>
          ))}
        </div>
      </section>
      <section className="home-final-cta" aria-labelledby="final-cta-heading">
        <div>
          <h2 id="final-cta-heading">
            {t("Make room for your next great hire.")}
          </h2>
          <p>{t("A simple, connected space for recruiters and candidates.")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={recruiter ? "/recruiter/jobs/new" : "/careers"}>
            {t(recruiter ? "New job" : "Explore vacancies")}
          </Link>
        </Button>
      </section>
    </div>
  );
}

async function LatestJobs() {
  const t = await getTranslator();
  const jobs = await getPublishedJobs({ pageSize: 3 });
  if (!jobs.items.length)
    return (
      <EmptyState
        title={t("No open vacancies yet")}
        message={t("Check back for new roles.")}
      />
    );
  return (
    <ul aria-label={t("Latest vacancies")}>
      {jobs.items.map((job) => (
        <PublicJobCard key={job.id} job={job} />
      ))}
    </ul>
  );
}
