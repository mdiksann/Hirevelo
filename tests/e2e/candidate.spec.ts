import { expect, test } from "@playwright/test";
import { isolateIp } from "./auth-helpers";
import { cleanupJob, db, publishedJob } from "./journey-fixtures";
test.beforeEach(async ({ context, page }) => {
  await isolateIp(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test.afterAll(() => db.$disconnect());
test("candidate registers, browses, applies by keyboard and sees status, duplicate conflict and role restrictions", async ({
  page,
  context,
}) => {
  const job = await publishedJob();
  const email = `candidate-journey-${crypto.randomUUID()}@example.com`;
  try {
    await page.goto("/register");
    await page.getByLabel("Name", { exact: false }).fill("Journey candidate");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/^Password/).fill("Strong-password-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/");
    await page
      .getByRole("link", { name: "Careers", exact: true })
      .first()
      .click();
    await page.getByLabel("Search jobs").fill(job.title);
    await expect(page).toHaveURL(
      new RegExp(`q=${encodeURIComponent(job.title).replace(/%20/g, "\\+")}`),
    );
    await page.getByRole("link", { name: new RegExp(job.title) }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(job.title);
    await page.getByRole("link", { name: "Apply", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/careers/${job.slug}/apply`);
    // Keyboard-only form traversal; setInputFiles supplies the native file chooser selection.
    await page.getByLabel("Cover note").focus();
    await page.keyboard.type("I would like to join your team.");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("CV (required)")).toBeFocused();
    await page
      .getByLabel("CV (required)")
      .setInputFiles("tests/fixtures/sample.pdf");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Submit application" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/applications");
    const row = page.getByRole("row").filter({
      has: page.getByRole("link", { name: job.title, exact: true }),
    });
    await expect(row).toContainText("Applied");
    await row.getByRole("link", { name: job.title, exact: true }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText(
      "Applied",
    );
    await page.goto(`/careers/${job.slug}/apply`);
    await expect(
      page.getByRole("heading", {
        name: "You have already applied to this job",
      }),
    ).toBeVisible();
    const duplicate = await context.request.post("/api/uploads/cv", {
      multipart: { jobId: job.id },
    });
    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      message: "You have already applied to this job.",
    });
    await page.goto("/recruiter/dashboard");
    await expect(
      page.getByRole("heading", { name: "Recruiter access required" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Hiring metrics", { exact: true }),
    ).toHaveCount(0);
  } finally {
    await cleanupJob(job.id);
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) {
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.fileObject.deleteMany({ where: { ownerId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
  }
});
test("candidate sees the seeded rejection reason", async ({ page }) => {
  const application = await db.application.findFirstOrThrow({
    where: {
      stage: "REJECTED",
      candidate: { email: "candidate3@example.com" },
      job: { slug: "software-engineer" },
    },
    select: { id: true, rejectionReason: true },
  });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("candidate3@example.com");
  await page.getByLabel(/^Password/).fill("Demo-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/applications");
  await page.goto(`/applications/${application.id}`);
  await expect(page.locator('[aria-current="step"]')).toContainText("Rejected");
  expect(application.rejectionReason).toBeTruthy();
  await expect(
    page.getByText(application.rejectionReason ?? "", { exact: true }),
  ).toBeVisible();
});
