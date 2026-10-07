import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { isolateIp, login } from "./auth-helpers";
import { applicants, cleanupJob, db, publishedJob } from "./journey-fixtures";
test.beforeEach(async ({ context, page }) => {
  await isolateIp(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test.afterAll(() => db.$disconnect());
test("WCAG 2.1 AA on careers, detail, sign-in, register, apply, dashboard, jobs and candidate profile", async ({
  page,
}) => {
  const job = await publishedJob();
  try {
    for (const path of [
      "/careers",
      `/careers/${job.slug}`,
      "/sign-in",
      "/register",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations, path).toEqual([]);
    }
    await login(page, "candidate");
    await page.goto(`/careers/${job.slug}/apply`);
    await expect(page.getByLabel("CV (required)")).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.context().clearCookies({ name: /^(?!hirevelo-language$)/ });
    const [application] = await applicants(job.id);
    if (!application) throw new Error("Missing profile fixture");
    await login(page, "recruiter");
    for (const path of [
      "/recruiter/dashboard",
      "/recruiter/jobs",
      `/recruiter/candidates/${application.id}`,
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations, path).toEqual([]);
    }
  } finally {
    await cleanupJob(job.id);
  }
});
test("careers list and job detail contain public content with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: "http://127.0.0.1:3100",
  });
  await context.addCookies([
    { name: "hirevelo-language", value: "en", url: "http://127.0.0.1:3100" },
  ]);
  const page = await context.newPage();
  try {
    await page.goto("/careers");
    await expect(
      page.getByRole("link", { name: /Product designer/ }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Product designer/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Product designer",
    );
    await expect(page.getByRole("article")).toBeVisible();
  } finally {
    await context.close();
  }
});
