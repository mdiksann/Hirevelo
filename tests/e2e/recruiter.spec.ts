import { expect, test, type Page } from "@playwright/test";
import { isolateIp, login } from "./auth-helpers";
import { applicants, cleanupJob, db } from "./journey-fixtures";
test.beforeEach(async ({ context }) => isolateIp(context));
test.afterAll(() => db.$disconnect());
async function move(page: Page, stage: string) {
  await page.getByRole("button", { name: "Move to…" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: stage, exact: true }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole(stage === "Hired" ? "alertdialog" : "dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", {
      name: stage === "Hired" ? "Confirm hire" : "Confirm move",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(stage, { exact: true })).toBeVisible();
}
test("recruiter publishes, interviews, hires, rejects, closes and archives a vacancy", async ({
  page,
  browser,
}) => {
  const title = `Recruiter journey ${crypto.randomUUID()}`;
  let jobId: string | undefined;
  const visitorContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  await visitorContext.addCookies([
    { name: "hirevelo-language", value: "en", url: "http://127.0.0.1:3100" },
  ]);
  const visitor = await visitorContext.newPage();
  try {
    await login(page, "recruiter");
    const metrics = page.getByLabel("Hiring metrics", { exact: true });
    for (const label of ["Open vacancies", "Total candidates"])
      expect(
        Number(
          await metrics
            .getByText(label, { exact: true })
            .locator("..")
            .locator("dd")
            .innerText(),
        ),
      ).toBeGreaterThan(0);
    expect(
      Number(
        await metrics
          .getByText("Applications in last 7 days", { exact: true })
          .locator("..")
          .locator("dd")
          .innerText(),
      ),
    ).toBeGreaterThanOrEqual(0);
    await page.getByRole("link", { name: "Jobs", exact: true }).click();
    await page.getByRole("link", { name: "New job", exact: true }).click();
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await page
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("Build accessible software with a collaborative team.");
    await page
      .getByRole("textbox", { name: "Location", exact: true })
      .fill("Remote");
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page).toHaveURL(/\/recruiter\/jobs\/c[a-z0-9]+$/);
    jobId = page.url().split("/").at(-1);
    if (!jobId) throw new Error("Missing job id");
    const jobUrl = `/recruiter/jobs/${jobId}`;
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Publish", exact: true })
      .click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    const publicUrl = await page
      .getByRole("link", { name: "View public job" })
      .getAttribute("href");
    if (!publicUrl) throw new Error("Missing public job link");
    await visitor.goto(`/careers?q=${encodeURIComponent(title)}`);
    await expect(
      visitor.getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();
    const [first, second] = await applicants(jobId);
    if (!first || !second) throw new Error("Missing applicants");
    await page.reload();
    await page
      .getByRole("table")
      .getByRole("link", { name: "Demo candidate 1", exact: true })
      .click();
    await expect(page).toHaveURL(`/recruiter/candidates/${first.id}`);
    for (const stage of ["Screening", "Interview"]) await move(page, stage);
    await page
      .getByLabel("Interview note (required)")
      .fill("Strong interview performance.");
    await page.getByRole("button", { name: "Add note", exact: true }).click();
    const timeline = page.getByRole("list", { name: "Application activity" });
    await expect(timeline).toContainText("Interview note added");
    await expect(
      page.getByRole("list", { name: "Interview notes", exact: true }),
    ).toContainText("Strong interview performance.");
    await move(page, "Offering");
    await move(page, "Hired");
    await expect(timeline).toContainText("Offering → Hired");
    await expect(page.getByRole("button", { name: "Move to…" })).toHaveCount(0);
    await page.goto(`/recruiter/candidates/${second.id}`);
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    const reject = page.getByRole("dialog", { name: "Reject application" });
    await reject
      .getByLabel("Rejection reason (required)")
      .fill("This role requires different experience.");
    await reject
      .getByRole("button", { name: "Reject application", exact: true })
      .click();
    await expect(reject).toHaveCount(0);
    await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
    await page.goto(jobUrl);
    for (const action of ["Close", "Archive"]) {
      await page.getByRole("button", { name: action, exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: action, exact: true })
        .click();
      await expect(
        page.getByText(action === "Close" ? "Closed" : "Archived", {
          exact: true,
        }),
      ).toBeVisible();
      await visitor.goto(`/careers?q=${encodeURIComponent(title)}`);
      await expect(
        visitor.getByRole("heading", { name: "No open jobs found" }),
      ).toBeVisible();
      await visitor.goto(publicUrl);
      await expect(
        visitor.getByRole("heading", { name: "Page not found" }),
      ).toBeVisible();
    }
    await page.goto(`/recruiter/candidates/${first.id}`);
    await expect(
      page.getByRole("button", { name: "Add note", exact: true }),
    ).toHaveCount(0);
  } finally {
    await visitorContext.close();
    // Also remove a draft if navigation failed before its id was captured.
    const job = jobId
      ? { id: jobId }
      : await db.job.findFirst({ where: { title }, select: { id: true } });
    if (job) await cleanupJob(job.id);
  }
});
