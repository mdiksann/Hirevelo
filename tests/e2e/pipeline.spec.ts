import { test, expect, type Page } from "@playwright/test";
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
  // Keep axe scans deterministic while success toasts enter and leave.
  await page.emulateMedia({ reducedMotion: "reduce" });
});
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
      title: `Pipeline E2E ${crypto.randomUUID()}`,
      description: "Build accessible software with our team.",
      location: "Remote",
      slug: `pipeline-${crypto.randomUUID()}`,
      status: "PUBLISHED",
      createdBy: { connect: { id: recruiter.id } },
    },
  });
  const file = await db.fileObject.create({
    data: {
      owner: { connect: { id: candidate.id } },
      storageKey: `pipeline-${crypto.randomUUID()}`,
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
  await db.activity.create({
    data: {
      type: "APPLICATION_CREATED",
      actor: { connect: { id: candidate.id } },
      application: { connect: { id: app.id } },
      job: { connect: { id: job.id } },
      data: { stage: "APPLIED" },
    },
  });
  return { app, job, file, recruiter };
}
async function cleanup(f: Awaited<ReturnType<typeof fixture>>) {
  await db.activity.deleteMany({ where: { applicationId: f.app.id } });
  await db.note.deleteMany({ where: { applicationId: f.app.id } });
  await db.application.delete({ where: { id: f.app.id } });
  await db.fileObject.delete({ where: { id: f.file.id } });
  await db.job.delete({ where: { id: f.job.id } });
}
async function axe(page: Page) {
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
}
async function chooseStage(page: Page, name: string) {
  await page.getByRole("button", { name: "Move to…" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name, exact: true })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Applied", exact: true }),
  ).toHaveCount(name === "Screening" ? 0 : 1);
  await page.getByRole("menuitem", { name, exact: true }).focus();
  await page.keyboard.press("Enter");
  if (name !== "Hired") {
    const dialog = page.getByRole("dialog", {
      name: `Move to ${name}`,
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: "Confirm move", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);
  }
}
async function focusTrapped(page: Page, role: "dialog" | "alertdialog") {
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole(role)
        .evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
}
test("recruiter moves Applied → Screening → Interview → Hired by keyboard, adds note and sees immutable history", async ({
  page,
}) => {
  const f = await fixture();
  try {
    await login(page, "recruiter");
    await page.goto(`/recruiter/candidates/${f.app.id}`);
    for (const name of ["Screening", "Interview"]) {
      await chooseStage(page, name);
      await expect(page.getByText(name, { exact: true })).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Application activity" }),
      ).toContainText(name);
    }
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.locator("#note-error")).toBeVisible();
    await page
      .getByLabel("Interview note (required)")
      .fill("Strong interview performance.");
    await page.getByRole("button", { name: "Add note" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("list", { name: "Interview notes", exact: true }),
    ).toContainText("Strong interview performance.");
    await expect(
      page.getByRole("list", { name: "Application activity" }),
    ).toContainText("Interview note added");
    await chooseStage(page, "Hired");
    await expect(
      page.getByRole("alertdialog", { name: "Hire candidate" }),
    ).toBeVisible();
    await axe(page);
    await focusTrapped(page, "alertdialog");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Move to…" })).toBeFocused();
    await chooseStage(page, "Hired");
    await page.getByRole("button", { name: "Confirm hire" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Hired", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Move to…" })).toHaveCount(0);
    const timeline = page.getByRole("list", { name: "Application activity" });
    await expect(timeline.getByRole("listitem")).toHaveCount(5);
    await expect(timeline).toContainText("Interview → Hired");
    await expect(timeline).toContainText(f.recruiter.name);
    await expect(timeline.getByRole("button")).toHaveCount(0);
    await axe(page);
  } finally {
    await cleanup(f);
  }
});
test("recruiter rejects with inline validation; owning candidate sees reason and safe history", async ({
  page,
  browser,
}) => {
  const f = await fixture();
  try {
    await login(page, "recruiter");
    await page.goto(`/recruiter/candidates/${f.app.id}`);
    await page
      .getByLabel("Interview note (required)")
      .fill("Private interview feedback.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(
      page.getByText("Private interview feedback.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reject", exact: true }).focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Reject application" });
    await expect(dialog).toBeVisible();
    await focusTrapped(page, "dialog");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Reject", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await dialog
      .getByRole("button", { name: "Reject application", exact: true })
      .click();
    await expect(dialog.locator("#rejection-error")).toContainText("3–500");
    await expect(
      dialog.getByLabel("Rejection reason (required)"),
    ).toHaveAttribute("aria-invalid", "true");
    await axe(page);
    await dialog
      .getByLabel("Rejection reason (required)")
      .fill("This role requires different experience.");
    await dialog
      .getByLabel("Internal comment (optional)")
      .fill("Private rejection decision.");
    await dialog
      .getByRole("button", { name: "Reject application", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    // PostgreSQL can serialize disjoint test writes on the same index pages.
    // Exercise the intended user retry only for the explicit retryable conflict.
    for (let attempt = 0; attempt < 2; attempt++) {
      const conflict = dialog.getByRole("alert").filter({
        hasText: "This application or job changed. Please try again.",
      });
      await expect
        .poll(
          async () =>
            (await dialog.count()) === 0 || (await conflict.isVisible()),
        )
        .toBe(true);
      if ((await dialog.count()) === 0) break;
      const submit = dialog.getByRole("button", {
        name: "Reject application",
        exact: true,
      });
      await expect(submit).toBeEnabled();
      await submit.focus();
      await page.keyboard.press("Enter");
    }
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
    const candidateContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
    });
    try {
      await isolateIp(candidateContext);
      const candidatePage = await candidateContext.newPage();
      await login(candidatePage, "candidate");
      await candidatePage.goto(`/applications/${f.app.id}`);
      await expect(
        candidatePage.getByText("This role requires different experience."),
      ).toBeVisible();
      await expect(
        candidatePage.locator('[aria-current="step"]'),
      ).toContainText("Rejected");
      const history = candidatePage.getByRole("list", {
        name: "Application activity",
      });
      await expect(history.getByRole("listitem")).toHaveCount(2);
      await expect(history.getByRole("listitem").first()).toContainText(
        "Application submitted",
      );
      await expect(history.getByRole("listitem").last()).toContainText(
        "Applied → Rejected",
      );
      await expect(history).toContainText("Recruiter");
      await expect(
        candidatePage.getByText("Private interview feedback."),
      ).toHaveCount(0);
      await expect(
        candidatePage.getByText("Private rejection decision."),
      ).toHaveCount(0);
      await expect(history).not.toContainText(f.recruiter.name);
      await axe(candidatePage);
    } finally {
      await candidateContext.close();
    }
  } finally {
    await cleanup(f);
  }
});
