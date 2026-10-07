import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const queries = vi.hoisted(() => ({ stats: vi.fn(), activity: vi.fn() }));
vi.mock("@/lib/queries/dashboard", () => ({
  getDashboardStats: queries.stats,
  getRecentActivity: queries.activity,
}));
vi.mock("@/lib/i18n/server", async () => {
  const { createTranslator } = await import("@/lib/i18n");
  return { getTranslator: async () => createTranslator("en") };
});
import { Dashboard } from "@/components/dashboard/Dashboard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import Loading from "@/app/(recruiter)/recruiter/loading";
import ErrorPage from "@/app/(recruiter)/recruiter/error";
const zero = {
  publishedJobs: 0,
  totalCandidates: 0,
  appliedLast7Days: 0,
  applicationsByStage: {
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    OFFERING: 0,
    HIRED: 0,
    REJECTED: 0,
  },
};
beforeEach(() => {
  queries.stats.mockResolvedValue(zero);
  queries.activity.mockResolvedValue([]);
});
it("renders empty metrics, accessible stage labels and feed guidance", async () => {
  const html = renderToStaticMarkup(await Dashboard());
  expect(html).toContain("No hiring data yet");
  expect(html).toContain("No applications yet.");
  expect(html).toContain("No activity yet.");
  expect(html).toContain('href="/recruiter/jobs/new"');
  for (const label of [
    "Applied",
    "Screening",
    "Interview",
    "Offering",
    "Hired",
    "Rejected",
  ])
    expect(html).toContain(`aria-label="${label}: 0 applications"`);
  expect(html).not.toMatch(/NaN|Infinity/);
});
it("renders metric DTO values and every stage as text with a filter link", async () => {
  queries.stats.mockResolvedValue({
    publishedJobs: 2,
    totalCandidates: 7,
    appliedLast7Days: 3,
    applicationsByStage: {
      APPLIED: 4,
      SCREENING: 3,
      INTERVIEW: 2,
      OFFERING: 1,
      HIRED: 5,
      REJECTED: 6,
    },
  });
  const html = renderToStaticMarkup(await Dashboard());
  expect(html).toContain('aria-label="Open vacancies: 2"');
  expect(html).toContain('aria-label="Total applications: 21"');
  expect(html).toMatch(/Total candidates<\/dt><dd[^>]*>7<\/dd>/);
  expect(html).toMatch(/Applications in last 7 days<\/dt><dd[^>]*>3<\/dd>/);
  expect(html).toContain('aria-label="Applied: 4 applications"');
  expect(html).toContain('aria-label="Rejected: 6 applications"');
  expect(html).toContain('href="/recruiter/candidates?stage=SCREENING"');
  expect(html).not.toContain("No hiring data yet");
});
it("links application events to profiles, job events to jobs, and standalone events without broken links", () => {
  const base = {
    id: "one",
    type: "APPLICATION_CREATED" as const,
    actor: "Recruiter",
    createdAt: "2026-10-06T12:00:00Z",
    from: null,
    to: null,
    comment: null,
    job: { id: "job-id", title: "Designer" },
    application: { id: "app-id", candidate: { name: "Candidate" } },
  };
  const html = renderToStaticMarkup(
    createElement(RecentActivity, {
      items: [
        base,
        { ...base, id: "two", type: "JOB_PUBLISHED", application: null },
        {
          ...base,
          id: "three",
          type: "JOB_UPDATED",
          application: null,
          job: null,
        },
      ],
    }),
  );
  expect(html).toContain('href="/recruiter/candidates/app-id"');
  expect(html).toContain('href="/recruiter/jobs/job-id"');
  expect(html).toContain("Job published");
  expect(html).toContain("Job updated");
  expect(html).toContain('aria-label="Recent activity"');
  expect(html.match(/href=/g) ?? []).toHaveLength(2);
});
it("provides a busy skeleton and a safe retry boundary for failed requests", async () => {
  expect(renderToStaticMarkup(createElement(Loading))).toContain(
    'aria-busy="true"',
  );
  queries.stats.mockRejectedValueOnce(new Error("database failure"));
  await expect(Dashboard()).rejects.toThrow("database failure");
  const html = renderToStaticMarkup(
    createElement(ErrorPage, { reset: () => {} }),
  );
  expect(html).toContain("Unable to load dashboard");
  expect(html).toContain("Try again");
  expect(html).not.toContain("database failure");
});
