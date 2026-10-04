import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("route groups render distinct navigation with accessible landmarks", async ({
  page,
}) => {
  for (const [path, title, navigation] of [
    ["/", "Hirevelo", "Public navigation"],
    ["/sign-in", "Sign in", "Account navigation"],
    ["/register", "Register", "Account navigation"],
    ["/careers", "Careers", "Public navigation"],
    ["/recruiter", "Dashboard", "Recruiter navigation"],
    ["/applications", "My applications", "Candidate navigation"],
  ] as const) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("navigation", { name: navigation }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nothing here yet" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});
test("desktop shell has specified geometry and keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/recruiter");
  expect((await page.locator("aside").boundingBox())?.width).toBe(240);
  const jobs = page.getByRole("link", { name: "Jobs", exact: true });
  expect((await jobs.boundingBox())?.height).toBe(36);
  await page.keyboard.press("Tab");
  await expect(page.locator("aside a").first()).toBeFocused();
  expect(
    await page
      .locator(":focus")
      .evaluate((node) => getComputedStyle(node).outlineWidth),
  ).toBe("2px");
  await jobs.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Jobs", exact: true }),
  ).toBeVisible();
  await expect(jobs).toHaveAttribute("aria-current", "page");
  expect(
    (await page.getByRole("navigation", { name: "Jobs views" }).boundingBox())
      ?.height,
  ).toBe(40);
  await page.screenshot({ path: "/tmp/hirevelo-foundation-desktop.png" });
});
test("mobile drawer traps focus, closes on Escape, and restores its trigger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/recruiter");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("navigation")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((node) => node.contains(document.activeElement)),
  ).toBe(true);
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("health endpoint and default missing-route state are safe", async ({
  request,
  page,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", db: "up" });
  await page.goto("/missing-foundation-route");
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to dashboard" }),
  ).toBeVisible();
});
test("throwing page shows a safe retry state and can recover", async ({
  page,
  context,
}) => {
  await page.goto("/foundation-test-error");
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "Unable to load this page" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText(
    "Foundation test private failure",
  );
  await context.addCookies([
    { name: "foundation-recovered", value: "1", url: "http://127.0.0.1:3100" },
  ]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Recovered" }),
  ).toBeVisible();
});
