import { expect, test } from "@playwright/test";

test("landing sections reveal once on scroll and stop for reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const cta = page.locator(".home-final-cta");
  await expect(cta).toHaveAttribute("data-reveal", "waiting");
  await expect(cta).toHaveCSS("opacity", "0");
  await cta.scrollIntoViewIfNeeded();
  await expect(cta).toHaveAttribute("data-reveal", "visible");
  await expect(cta).toHaveCSS("opacity", "1");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(cta).toHaveAttribute("data-reveal", "visible");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-reveal="waiting"]')).toHaveCount(0);
  expect(
    await page
      .locator(".hirevelo-home")
      .evaluate((node) => node.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.reload();
  await expect(cta).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-reveal="waiting"]')).toHaveCount(0);
});
