import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import { isolateIp, login } from "./auth-helpers";
const database =
  process.env.DATABASE_URL_TEST ??
  "postgresql://hirevelo:hirevelo_local@localhost:5432/hirevelo_test";
if (!new URL(database).pathname.endsWith("_test"))
  throw new Error("E2E requires test DB");
const db = new PrismaClient({ datasourceUrl: database });
test.beforeEach(async ({ context, page }) => {
  await isolateIp(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test.afterAll(async () => {
  await db.$disconnect();
});

test("homepage remains readable, navigation stays available and reduced motion keeps content visible", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const title = page.getByRole("heading", { level: 1 });
  expect(
    await title.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
  ).toBeGreaterThanOrEqual(60);
  const header = page.locator("header");
  await expect(header).toHaveCSS("position", "sticky");
  await page.locator(".home-showcase").scrollIntoViewIfNeeded();
  await expect(header).toBeInViewport();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(title).toBeVisible();
  expect(
    await page
      .locator(".home-candidates")
      .evaluate((node) => node.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.screenshot({
    path: testInfo.outputPath("homepage-native-zoom.png"),
    fullPage: true,
  });
});

test("homepage exposes public and authenticated entry points; cancel does not create a job", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Public navigation" })
      .getByRole("link", { name: "Recruiter sign in" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Recruiter sign in", exact: true }),
  ).toHaveAttribute("href", "/recruiter/sign-in");
  await expect(
    page
      .getByRole("navigation", { name: "Public navigation" })
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveAttribute("href", "/sign-in");
  await expect(
    page
      .getByRole("region", { name: "Getting started" })
      .getByRole("link", { name: "Create candidate account" }),
  ).toHaveAttribute("href", "/register");
  await expect(
    page.getByRole("heading", { name: "Latest vacancies" }),
  ).toBeVisible();
  const question = page.locator("summary").filter({
    hasText: "Can I check my application status?",
  });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(question.locator("..")).toHaveAttribute("open", "");
  await expect(question.locator("..")).toContainText("application history");
  await page.keyboard.press("Space");
  await expect(question.locator("..")).not.toHaveAttribute("open", "");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("homepage-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("homepage-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await login(page, "candidate");
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Public navigation" })
      .getByRole("link", { name: "My applications" }),
  ).toHaveAttribute("href", "/applications");
  await page.context().clearCookies({ name: /^(?!hirevelo-language$)/ });
  await login(page, "recruiter");
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Open dashboard" }),
  ).toHaveAttribute("href", "/recruiter");
  await page.goto("/recruiter/jobs/new");
  const title = `Cancelled ${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/recruiter\/jobs$/);
  expect(await db.job.count({ where: { title } })).toBe(0);
});

test("job applicants paginate, filters validate, and internal stage comments remain private", async ({
  page,
  browser,
}) => {
  const recruiter = await db.user.findUniqueOrThrow({
    where: { email: "recruiter@example.com" },
  });
  const candidate = await db.user.findUniqueOrThrow({
    where: { email: "candidate1@example.com" },
  });
  const marker = crypto.randomUUID();
  const job = await db.job.create({
    data: {
      title: `Frontend ${marker}`,
      slug: `frontend-${marker}`,
      description: "Build accessible applications together with our team.",
      location: "Remote",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdById: recruiter.id,
    },
  });
  const userIds: string[] = [];
  const fileIds: string[] = [];
  let applicationId = "";
  const candidateContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  try {
    for (let index = 0; index < 21; index++) {
      const user =
        index === 0
          ? candidate
          : await db.user.create({
              data: {
                email: `frontend-${marker}-${index}@example.com`,
                name: `Frontend applicant ${index}`,
                passwordHash: "unused",
              },
            });
      if (index > 0) userIds.push(user.id);
      const file = await db.fileObject.create({
        data: {
          ownerId: user.id,
          storageKey: `frontend-${marker}-${index}`,
          originalName: "cv.pdf",
          mimeType: "application/pdf",
          sizeBytes: 10,
        },
      });
      fileIds.push(file.id);
      const application = await db.application.create({
        data: {
          candidateId: user.id,
          jobId: job.id,
          cvFileId: file.id,
          appliedAt: new Date(Date.now() - index * 1000),
        },
      });
      if (index === 0) applicationId = application.id;
    }
    await login(page, "recruiter");
    await page.goto(`/recruiter/jobs/${job.id}`);
    const table = page.getByRole("table", { name: "Candidate applications" });
    await expect(table.getByRole("row")).toHaveCount(21);
    await page
      .getByRole("navigation", { name: "Job applicants pagination" })
      .getByRole("link", { name: "Next" })
      .click();
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table).toContainText("Frontend applicant 20");
    await page
      .getByRole("link", { name: "Search and filter applicants" })
      .click();
    await expect(page).toHaveURL(new RegExp(`jobId=${job.id}`));
    await page.getByLabel("Applied from").fill("2020-01-02");
    await expect(page).toHaveURL(/dateFrom=2020-01-02/);
    await page.getByLabel("Applied to").fill("2020-01-01");
    await expect(page.locator("#candidate-filter-error")).toBeVisible();
    expect(page.url()).not.toContain("dateTo=2020-01-01");
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(page).toHaveURL(/\/recruiter\/candidates$/);
    await page.goto(`/recruiter/candidates/${applicationId}`);
    await expect(
      page.getByRole("list", { name: "Application pipeline" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View job", exact: true }),
    ).toHaveAttribute("href", `/recruiter/jobs/${job.id}`);
    await page.getByRole("button", { name: "Move to…" }).click();
    await page
      .getByRole("menuitem", { name: "Screening", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Move to Screening" });
    await dialog
      .getByLabel("Internal comment (optional)")
      .fill("Cancelled private comment");
    await page.keyboard.press("Escape");
    expect(
      (await db.application.findUniqueOrThrow({ where: { id: applicationId } }))
        .stage,
    ).toBe("APPLIED");
    await expect(page.getByRole("button", { name: "Move to…" })).toBeFocused();
    await page.keyboard.press("Enter");
    await page
      .getByRole("menuitem", { name: "Screening", exact: true })
      .click();
    await dialog
      .getByLabel("Internal comment (optional)")
      .fill("Private screening decision.");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await dialog.getByRole("button", { name: "Confirm move" }).click();
    await expect(
      page.getByRole("list", { name: "Application activity" }),
    ).toContainText("Private screening decision.");
    await isolateIp(candidateContext);
    const visitor = await candidateContext.newPage();
    await login(visitor, "candidate");
    await visitor.goto(`/careers/${job.slug}`);
    await visitor.getByRole("link", { name: "View my applications" }).click();
    await expect(visitor).toHaveURL(/\/applications$/);
    await visitor.goto(`/applications/${applicationId}`);
    await expect(
      visitor.getByRole("list", { name: "Application activity" }),
    ).toContainText("Screening");
    await expect(visitor.getByText("Private screening decision.")).toHaveCount(
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/recruiter/jobs/${job.id}`);
    await expect(table.getByRole("row")).toHaveCount(21);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  } finally {
    await candidateContext.close();
    await db.activity.deleteMany({ where: { jobId: job.id } });
    await db.application.deleteMany({ where: { jobId: job.id } });
    await db.fileObject.deleteMany({ where: { id: { in: fileIds } } });
    await db.job.delete({ where: { id: job.id } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  }
});
