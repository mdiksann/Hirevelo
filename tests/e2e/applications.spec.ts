import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { isolateIp, login } from "./auth-helpers";
const database =
  process.env.DATABASE_URL_TEST ??
  "postgresql://hirevelo:hirevelo_local@localhost:5432/hirevelo_test";
if (!new URL(database).pathname.endsWith("_test"))
  throw new Error("E2E requires test DB");
const db = new PrismaClient({ datasourceUrl: database });
test.beforeEach(async ({ context }) => isolateIp(context));
test.afterAll(async () => {
  await db.$disconnect();
});
async function axe(page: import("@playwright/test").Page) {
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
}
async function fixture() {
  const recruiter = await db.user.findUniqueOrThrow({
    where: { email: "recruiter@example.com" },
  });
  return db.job.create({
    data: {
      title: `Application E2E ${crypto.randomUUID()}`,
      slug: `application-e2e-${crypto.randomUUID()}`,
      description: "Help our team build accessible software products.",
      location: "Remote",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: { connect: { id: recruiter.id } },
    },
  });
}
async function cleanup(jobId: string) {
  await db.activity.deleteMany({ where: { jobId } });
  await db.application.deleteMany({ where: { jobId } });
  await db.job.delete({ where: { id: jobId } });
}
test("candidate returns from sign-in, applies by keyboard, sees own status; recruiter searches profile and downloads CV", async ({
  page,
  browser,
}) => {
  const job = await fixture();
  let candidateId: string | undefined;
  const email = `apply-${crypto.randomUUID()}@example.com`;
  try {
    await page.goto(`/careers/${job.slug}/apply`);
    await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
    await page
      .locator("section")
      .getByRole("link", { name: "Register", exact: true })
      .click();
    await page
      .getByLabel("Name", { exact: false })
      .fill("Application test candidate");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/^Password/).fill("Strong-password-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(`/careers/${job.slug}/apply`);
    await axe(page);
    await page.getByRole("button", { name: "Submit application" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("form").getByRole("alert")).toContainText(
      "Choose a CV file.",
    );
    await page.getByLabel("Cover note").fill("I would like to join your team.");
    await page
      .getByLabel("CV (required)")
      .setInputFiles("tests/fixtures/sample.pdf");
    await page.getByRole("button", { name: "Submit application" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/applications");
    await expect(
      page.getByText("Application submitted", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell").getByText("Applied", { exact: true }),
    ).toBeVisible();
    await axe(page);
    const row = await db.application.findFirstOrThrow({
      where: { jobId: job.id, candidate: { email } },
    });
    candidateId = row.candidateId;
    await page.getByRole("link", { name: job.title, exact: true }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText(
      "Applied",
    );
    await expect(
      page.getByText("I would like to join your team."),
    ).toBeVisible();
    await axe(page);
    const downloaded = page.waitForEvent("download");
    await page.getByRole("link", { name: /Download CV:/ }).click();
    expect((await downloaded).suggestedFilename()).toBe("sample.pdf");
    await page.goto(`/careers/${job.slug}/apply`);
    await expect(
      page.getByRole("heading", {
        name: "You have already applied to this job",
      }),
    ).toBeVisible();
    await page.goto("/recruiter/candidates");
    await expect(
      page.getByRole("heading", { name: "Recruiter access required" }),
    ).toBeVisible();
    const recruiterContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
    });
    const recruiterPage = await recruiterContext.newPage();
    try {
      await isolateIp(recruiterContext);
      await login(recruiterPage, "recruiter");
      await recruiterPage.goto("/recruiter/candidates");
      await recruiterPage
        .getByLabel("Search candidates")
        .fill(email.toUpperCase());
      await expect(recruiterPage).toHaveURL(
        new RegExp(`q=${encodeURIComponent(email.toUpperCase())}`),
      );
      await expect(
        recruiterPage.getByRole("table").getByText(email),
      ).toBeVisible();
      await axe(recruiterPage);
      await recruiterPage
        .getByRole("link", { name: "Application test candidate", exact: true })
        .click();
      await expect(recruiterPage.getByRole("heading", { level: 1 })).toHaveText(
        "Application test candidate",
      );
      for (const name of [
        "Stage actions",
        "Interview notes",
        "Activity timeline",
      ])
        await expect(
          recruiterPage.getByRole("heading", { name, exact: true }),
        ).toBeVisible();
      await axe(recruiterPage);
      const cvDownload = recruiterPage.waitForEvent("download");
      await recruiterPage
        .getByRole("link", { name: "Download CV", exact: true })
        .click();
      expect((await cvDownload).suggestedFilename()).toBe("sample.pdf");
    } finally {
      await recruiterContext.close();
    }
    await db.application.update({
      where: { id: row.id },
      data: {
        stage: "REJECTED",
        rejectionReason: "This role requires different experience.",
      },
    });
    await page.goto(`/applications/${row.id}`);
    await expect(
      page.getByText("This role requires different experience."),
    ).toBeVisible();
    await expect(page.locator('[aria-current="step"]')).toContainText(
      "Rejected",
    );
    await axe(page);
    await page.goto("/applications/clabcdefghij1234567890");
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  } finally {
    await cleanup(job.id);
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    candidateId ??= user?.id;
    if (candidateId) {
      const files = await db.fileObject.findMany({
        where: { ownerId: candidateId },
      });
      const { unlink } = await import("node:fs/promises");
      const { resolve } = await import("node:path");
      for (const file of files)
        await unlink(
          resolve(process.env.STORAGE_DIR ?? "./storage/cv", file.storageKey),
        ).catch((error) => {
          if (error.code !== "ENOENT") throw error;
        });
      await db.fileObject.deleteMany({ where: { ownerId: candidateId } });
      await db.user.delete({ where: { id: candidateId } });
    }
  }
});
test("existing candidate returns to apply after sign-in; upload and application ownership enforced over HTTP", async ({
  page,
  browser,
  context,
}) => {
  const job = await fixture();
  try {
    await page.goto(`/careers/${job.slug}/apply`);
    await page.getByLabel("Email").fill("candidate1@example.com");
    await page.getByLabel(/^Password/).fill("Demo-password-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(`/careers/${job.slug}/apply`);
    expect(
      (
        await context.request.post("/api/uploads/cv", {
          multipart: {
            jobId: job.id,
            file: {
              name: "too-large.pdf",
              mimeType: "application/pdf",
              buffer: Buffer.alloc(6 * 1024 * 1024),
            },
          },
        })
      ).status(),
    ).toBe(413);
    expect(
      (
        await context.request.post("/api/uploads/cv", {
          multipart: {
            jobId: job.id,
            file: {
              name: "evil.exe",
              mimeType: "application/pdf",
              buffer: Buffer.from("invalid"),
            },
          },
        })
      ).status(),
    ).toBe(415);
    const response = await context.request.post("/api/uploads/cv", {
      multipart: {
        jobId: job.id,
        file: {
          name: "sample.pdf",
          mimeType: "application/pdf",
          buffer: readFileSync("tests/fixtures/sample.pdf"),
        },
      },
    });
    expect(response.status()).toBe(201);
    const file = await response.json();
    expect(
      (await context.request.get(`/api/files/${file.fileId}`)).status(),
    ).toBe(200);
    const anon = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
    try {
      expect(
        (await anon.request.get(`/api/files/${file.fileId}`)).status(),
      ).toBe(401);
    } finally {
      await anon.close();
    }
    const row = await db.application.create({
      data: {
        job: { connect: { id: job.id } },
        candidate: { connect: { email: "candidate2@example.com" } },
        cvFile: { connect: { id: file.fileId } },
      },
    });
    await page.goto(`/applications/${row.id}`);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
    const metadata = await db.fileObject.findUniqueOrThrow({
      where: { id: file.fileId },
    });
    await cleanup(job.id);
    await db.fileObject.delete({ where: { id: file.fileId } });
    const { unlink } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    await unlink(
      resolve(process.env.STORAGE_DIR ?? "./storage/cv", metadata.storageKey),
    );
  } finally {
    if (await db.job.findUnique({ where: { id: job.id } }))
      await cleanup(job.id);
  }
});

test("seeded rejection reason is visible to its candidate", async ({
  page,
}) => {
  const row = await db.application.findFirstOrThrow({
    where: {
      stage: "REJECTED",
      candidate: { email: "candidate3@example.com" },
    },
    select: { id: true, rejectionReason: true },
  });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("candidate3@example.com");
  await page.getByLabel(/^Password/).fill("Demo-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/applications");
  await page.goto(`/applications/${row.id}`);
  await expect(
    page.getByRole("heading", { name: "Rejection reason" }),
  ).toBeVisible();
  await expect(
    page.getByText(row.rejectionReason ?? "", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("Rejected");
  await axe(page);
});
