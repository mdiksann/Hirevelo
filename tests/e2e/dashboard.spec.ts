import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import { isolateIp, login } from "./auth-helpers";
const database =
  process.env.DATABASE_URL_TEST ??
  "postgresql://hirevelo:hirevelo_local@localhost:5432/hirevelo_test";
if (!new URL(database).pathname.endsWith("_test"))
  throw new Error("E2E requires a test database");
const db = new PrismaClient({ datasourceUrl: database });
test.beforeEach(async ({ context }) => isolateIp(context));
test.afterAll(async () => {
  await db.$disconnect();
});
async function fixture() {
  const recruiter = await db.user.findUniqueOrThrow({
    where: { email: "recruiter@example.com" },
  });
  const candidate = await db.user.findUniqueOrThrow({
    where: { email: "candidate1@example.com" },
  });
  const job = await db.job.create({
    data: {
      title: `Dashboard ${crypto.randomUUID()}`,
      slug: `dashboard-${crypto.randomUUID()}`,
      description: "Build accessible products for our customers.",
      location: "Remote",
      status: "PUBLISHED",
      createdBy: { connect: { id: recruiter.id } },
    },
  });
  const file = await db.fileObject.create({
    data: {
      owner: { connect: { id: candidate.id } },
      storageKey: `dashboard-${crypto.randomUUID()}`,
      originalName: "cv.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
    },
  });
  const app = await db.application.create({
    data: {
      job: { connect: { id: job.id } },
      candidate: { connect: { id: candidate.id } },
      cvFile: { connect: { id: file.id } },
    },
  });
  for (const type of ["APPLICATION_CREATED", "JOB_PUBLISHED"] as const)
    await db.activity.create({
      data: {
        type,
        actor: {
          connect: {
            id: type === "APPLICATION_CREATED" ? candidate.id : recruiter.id,
          },
        },
        job: { connect: { id: job.id } },
        ...(type === "APPLICATION_CREATED"
          ? { application: { connect: { id: app.id } } }
          : {}),
        data: { stage: "APPLIED" },
      },
    });
  return { app, job, file, candidate };
}
async function cleanup(f: Awaited<ReturnType<typeof fixture>>) {
  await db.activity.deleteMany({ where: { jobId: f.job.id } });
  await db.note.deleteMany({ where: { applicationId: f.app.id } });
  await db.application.delete({ where: { id: f.app.id } });
  await db.fileObject.delete({ where: { id: f.file.id } });
  await db.job.delete({ where: { id: f.job.id } });
}
test("recruiter lands on live dashboard, follows stage filters and recent application/job links", async ({
  page,
}) => {
  await login(page, "recruiter");
  await expect(
    page.getByRole("heading", { name: "Applications by stage", exact: true }),
  ).toBeVisible();
  const f = await fixture();
  try {
    await page.goto("/recruiter/dashboard");
    await expect(
      page.getByRole("link", { name: "Dashboard", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    const metrics = page.getByLabel("Hiring metrics", { exact: true });
    // Other independent specs can create data; exact aggregate values are tested against the isolated integration fixture.
    for (const label of [
      "Open vacancies",
      "Total candidates",
      "Applications in last 7 days",
      "Total applications",
    ]) {
      const value = await metrics
        .getByText(label, { exact: true })
        .locator("..")
        .locator("dd")
        .innerText();
      expect(Number(value)).toBeGreaterThan(0);
    }
    const stages = page.getByRole("list", { name: "Stage distribution" });
    await expect(stages.getByRole("listitem")).toHaveCount(6);
    for (const stage of [
      "Applied",
      "Screening",
      "Interview",
      "Offering",
      "Hired",
      "Rejected",
    ])
      await expect(
        stages.getByRole("link", {
          name: new RegExp(`^${stage}: \\d+ applications$`),
        }),
      ).toBeVisible();
    const recent = page.getByRole("list", {
      name: "Recent activity",
      exact: true,
    });
    const count = await recent.getByRole("listitem").count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(10);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const profileLink = recent.locator(
      `a[href="/recruiter/candidates/${f.app.id}"]`,
    );
    await expect(profileLink).toContainText(f.job.title);
    await profileLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/recruiter/candidates/${f.app.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      f.candidate.name,
    );
    await page.goto("/recruiter/dashboard");
    await page
      .getByRole("list", { name: "Recent activity", exact: true })
      .getByRole("link", { name: f.job.title, exact: true })
      .click();
    await expect(page).toHaveURL(`/recruiter/jobs/${f.job.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      f.job.title,
    );
    await page.goto("/recruiter");
    await page
      .getByRole("list", { name: "Stage distribution" })
      .getByRole("link", { name: /^Applied: / })
      .click();
    await expect(page).toHaveURL(/\/recruiter\/candidates\?stage=APPLIED$/);
    await expect(
      page.getByRole("table").getByRole("row").filter({ hasText: f.job.title }),
    ).toContainText("Applied");
  } finally {
    await cleanup(f);
  }
});
test("dashboard blocks anonymous and candidate access at both URLs", async ({
  page,
}) => {
  for (const path of ["/recruiter", "/recruiter/dashboard"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(
      page.getByLabel("Hiring metrics", { exact: true }),
    ).toHaveCount(0);
  }
  await login(page, "candidate");
  for (const path of ["/recruiter", "/recruiter/dashboard"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", {
        name: "Recruiter access required",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Hiring metrics", { exact: true }),
    ).toHaveCount(0);
  }
});
test("dashboard remains readable on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page, "recruiter");
  await expect(
    page.getByRole("heading", { name: "Recent activity", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
