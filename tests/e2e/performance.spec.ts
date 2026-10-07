import { expect, test } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { isolateIp, login } from "./auth-helpers";
test("measure production recruiter JS and warm server responses", async ({
  page,
  context,
}, testInfo) => {
  await isolateIp(context);
  await login(page, "recruiter");
  const reports = [];
  for (const route of [
    "/recruiter",
    "/recruiter/dashboard",
    "/recruiter/jobs",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const scripts = await page
      .locator("script[src]:not([nomodule])")
      .evaluateAll((nodes) => [
        ...new Set(
          nodes.map(
            (node) => new URL((node as HTMLScriptElement).src).pathname,
          ),
        ),
      ]);
    const files = scripts
      .filter((file) => file.endsWith(".js"))
      .map((file) => {
        if (!/^\/_next\/static\/[a-zA-Z0-9_./()%\[\]-]+\.js$/.test(file))
          throw new Error("Unexpected script path");
        const local = `.next/${decodeURIComponent(file.slice("/_next/".length))}`;
        return { file, gzipBytes: gzipSync(readFileSync(local)).length };
      });
    expect(files.length).toBeGreaterThan(0);
    reports.push({
      route,
      gzipBytes: files.reduce((sum, file) => sum + file.gzipBytes, 0),
      files,
    });
  }
  // This artifact survives test:e2e's deliberate .next cleanup.
  mkdirSync("test-results", { recursive: true });
  const json = JSON.stringify(reports, null, 2);
  writeFileSync("test-results/bundle-budget.json", json);
  await testInfo.attach("bundle-budget", {
    body: json,
    contentType: "application/json",
  });
  for (const route of [
    "/careers",
    "/careers/product-designer",
    "/recruiter/dashboard",
  ]) {
    const response = await context.request.get(route);
    expect(response.ok()).toBe(true);
    // Measure server TTFB rather than browser hydration or asset downloads.
    const timing = await page.goto(route);
    expect(timing?.ok()).toBe(true);
    const ttfb = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      return navigation.responseStart - navigation.requestStart;
    });
    await testInfo.attach(`ttfb-${route.replaceAll("/", "-")}`, {
      body: `${ttfb.toFixed(1)} ms`,
      contentType: "text/plain",
    });
    // Record timings without a flaky wall-clock assertion on shared CI runners.
    expect(ttfb).toBeGreaterThanOrEqual(0);
  }
});
