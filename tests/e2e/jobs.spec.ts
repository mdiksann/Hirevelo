import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { isolateIp, login } from "./auth-helpers";

test.beforeEach(async ({ context }) => isolateIp(context));

test("recruiter creates, edits, publishes, closes, reopens and archives a job", async ({
  page,
  browser,
}) => {
  const title = `E2E vacancy ${crypto.randomUUID()}`;
  const description =
    "Design accessible products with our collaborative team.\n\n<script>alert('unsafe')</script> is displayed as text.";
  await login(page, "recruiter");
  await page.goto("/recruiter/jobs/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill(description);
  await page
    .getByRole("textbox", { name: "Location", exact: true })
    .fill("Jakarta");
  await page.getByLabel("Salary minimum").fill("1000");
  await page.getByLabel("Salary maximum").fill("2000");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page).toHaveURL(/\/recruiter\/jobs\/c[a-z0-9]+$/);
  const detail = page.url();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preview job" }).click();
  const preview = page.getByRole("dialog", { name: title });
  for (const paragraph of description.split("\n\n"))
    await expect(preview.getByText(paragraph, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Preview job" })).toBeFocused();
  await page.getByRole("link", { name: "Edit job", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue(title);
  await expect(
    page.getByRole("textbox", { name: "Description", exact: true }),
  ).toHaveValue(description);
  await expect(page.getByLabel("Salary minimum")).toHaveValue("1000");
  await page
    .getByRole("textbox", { name: "Location", exact: true })
    .fill("Remote");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(detail);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").evaluate(async (node) => {
    await Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  const slugUrl = await page
    .getByRole("link", { name: "View public job" })
    .getAttribute("href");
  if (!slugUrl) throw new Error("Missing public URL");
  const publicContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  await publicContext.addCookies([
    { name: "hirevelo-language", value: "en", url: "http://127.0.0.1:3100" },
  ]);
  const visitor = await publicContext.newPage();
  try {
    await visitor.goto(`/careers?q=${encodeURIComponent(title)}`);
    await expect(
      visitor.getByRole("link", { name: new RegExp(title) }),
    ).toBeVisible();
    await visitor.goto(slugUrl);
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(visitor.getByRole("article")).toBeVisible();
    await expect(
      visitor.getByText(
        "<script>alert('unsafe')</script> is displayed as text.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      visitor.getByRole("link", { name: "Sign in to apply" }),
    ).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page: visitor })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await login(visitor, "candidate");
    await visitor.goto(slugUrl);
    await expect(
      visitor.getByRole("link", { name: "Apply", exact: true }),
    ).toHaveAttribute("href", `${slugUrl}/apply`);
    await publicContext.clearCookies({ name: /^(?!hirevelo-language$)/ });
    for (const action of ["Close", "Publish", "Archive"]) {
      await page.getByRole("button", { name: action, exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: action, exact: true })
        .click();
      await expect(
        page.getByText(
          action === "Close"
            ? "Closed"
            : action === "Publish"
              ? "Published"
              : "Archived",
          { exact: true },
        ),
      ).toBeVisible();
      await visitor.goto(`/careers?q=${encodeURIComponent(title)}`);
      if (action === "Publish")
        await expect(
          visitor.getByRole("link", { name: new RegExp(title) }),
        ).toBeVisible();
      else {
        await expect(
          visitor.getByRole("heading", { name: "No open jobs found" }),
        ).toBeVisible();
        const response = await visitor.goto(slugUrl);
        expect(response?.status()).toBe(404);
        await expect(
          visitor.getByRole("heading", { level: 1, name: "Page not found" }),
        ).toBeVisible();
      }
    }
    await expect(
      page.getByRole("link", { name: "Edit job", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Archived jobs are read-only.")).toBeVisible();
  } finally {
    await publicContext.close();
  }
});

test("empty and invalid job forms show accessible errors and retain entered values", async ({
  page,
}) => {
  await login(page, "recruiter");
  await page.goto("/recruiter/jobs/new");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.locator("form").getByRole("alert")).toBeFocused();
  for (const name of ["Title", "Description", "Location"]) {
    const field = page.getByRole("textbox", { name, exact: true });
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAttribute("aria-describedby", /-error$/);
  }
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Invalid salary vacancy");
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("A sufficiently long description for this vacancy.");
  await page
    .getByRole("textbox", { name: "Location", exact: true })
    .fill("Remote");
  await page.getByLabel("Salary minimum").fill("2000");
  await page.getByLabel("Salary maximum").fill("1000");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByLabel("Salary maximum")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Invalid salary vacancy");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .locator("form")
    .getByRole("alert")
    .getByRole("link")
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Salary maximum")).toBeFocused();
  expect(
    await page
      .locator(":focus")
      .evaluate((node) => getComputedStyle(node).boxShadow),
  ).not.toBe("none");
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/hirevelo-job-form-mobile.png" });
});

test("recruiter search, filters and empty results work on seeded jobs", async ({
  page,
}) => {
  await login(page, "recruiter");
  await page.goto("/recruiter/jobs");
  await page.getByLabel("Search jobs").fill("PRODUCT DESIGNER");
  await expect(page).toHaveURL(/q=PRODUCT\+DESIGNER/);
  await expect(
    page
      .getByRole("table")
      .getByRole("link", { name: "Product designer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Jobs views" })
    .getByRole("link", { name: "Draft", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No jobs found" }),
  ).toBeVisible();
  await page.getByLabel("Search jobs").fill("Operations specialist");
  await expect(
    page
      .getByRole("table")
      .getByRole("link", { name: "Operations specialist", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: "Archived", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No jobs found" }),
  ).toBeVisible();
  await page.goto("/recruiter/jobs?q=zz-no-such-job");
  await expect(
    page.getByRole("heading", { name: "No jobs found" }),
  ).toBeVisible();
  await page.goto("/recruiter/jobs?q=Product+designer");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: "/tmp/hirevelo-jobs-desktop.png" });
});

test("careers is public, hides private jobs, returns 404s and checks candidate applications", async ({
  page,
}) => {
  const html = await (await page.request.get("/careers")).text();
  expect(html).toContain("Product designer");
  await page.goto("/careers");
  await expect(
    page.getByRole("link", { name: /Product designer/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Operations specialist|People partner|Support specialist/,
    }),
  ).toHaveCount(0);
  for (const slug of [
    "missing-vacancy",
    "operations-specialist",
    "people-partner",
    "support-specialist",
    "INVALID_SLUG",
  ]) {
    const response = await page.goto(`/careers/${slug}`);
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      "noindex",
    );
    const crawler = await page.request.get(`/careers/${slug}`, {
      headers: { "user-agent": "Twitterbot" },
    });
    expect(crawler.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
  }
  await login(page, "candidate");
  await page.goto("/careers/product-designer");
  await expect(
    page.getByRole("button", { name: "Apply", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("You have already applied to this job."),
  ).toBeVisible();
  await page.goto("/recruiter/jobs/new");
  await expect(
    page.getByRole("heading", { level: 1, name: "Recruiter access required" }),
  ).toBeVisible();
  await page.context().clearCookies({ name: /^(?!hirevelo-language$)/ });
  await page.goto("/recruiter/jobs");
  await expect(page).toHaveURL(/\/sign-in$/);
});
