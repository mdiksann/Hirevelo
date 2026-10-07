import { expect, test } from "@playwright/test";
import { login } from "./auth-helpers";
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("chosen logo appears across portals and browser/share icons load", async ({
  page,
}) => {
  for (const route of ["/", "/register", "/sign-in", "/recruiter/sign-in"]) {
    await page.goto(route);
    const logo = page.locator(".brand-logo").first();
    await expect(logo).toHaveAttribute("src", "/brand/hirevelo-horizontal.svg");
    await expect(logo).toBeVisible();
    expect(
      await logo.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    ).toBe(true);
    const brand = page
      .getByRole("link", { name: "Hirevelo", exact: true })
      .first();
    await expect(brand).toHaveAttribute("href", "/");
  }
  for (const rel of ["icon", "apple-touch-icon"]) {
    const hrefs = await page
      .locator(`link[rel="${rel}"]`)
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLLinkElement).href),
      );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect(response.ok()).toBe(true);
      expect((await response.body()).length).toBeGreaterThan(0);
    }
  }
  const shareImage = page.locator('meta[property="og:image"]');
  await expect(shareImage).toHaveAttribute("content", /opengraph-image/);
  const shareUrl = await shareImage.getAttribute("content");
  expect(new URL(shareUrl!).origin).toBe(new URL(page.url()).origin);
  const response = await page.request.get(shareUrl!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  await login(page, "recruiter");
  await page.goto("/recruiter");
  await expect(page.locator(".brand-logo").first()).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(
    page.locator(".brand-logo").filter({ visible: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
