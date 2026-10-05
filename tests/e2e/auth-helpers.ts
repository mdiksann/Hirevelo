import type { Page, BrowserContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { randomInt } from "node:crypto";
export async function isolateIp(context: BrowserContext) {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `198.18.${randomInt(1, 255)}.${randomInt(1, 255)}`,
  });
}
export async function login(page: Page, role: "recruiter" | "candidate") {
  await page.goto("/sign-in");
  await page
    .getByLabel("Email")
    .fill(
      role === "recruiter" ? "recruiter@example.com" : "candidate1@example.com",
    );
  await page.getByLabel("Password").fill("Demo-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    role === "recruiter" ? /\/recruiter$/ : /:3100\/$/,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: role === "recruiter" ? "Dashboard" : "Hirevelo",
      exact: true,
    }),
  ).toBeVisible();
}
