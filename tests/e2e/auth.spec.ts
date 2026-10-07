import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { isolateIp, login } from "./auth-helpers";

test.beforeEach(async ({ context }) => isolateIp(context));
test("registration validates fields, creates a session, and reports duplicate email", async ({
  page,
  context,
}) => {
  const email = `auth-${crypto.randomUUID()}@example.com`;
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("Email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Name").fill("New candidate");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill("Strong-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/:3100\/$/);
  expect(
    await (await page.request.get("/api/auth/session")).json(),
  ).toMatchObject({ user: { email, role: "CANDIDATE" } });
  await page.goto("/applications");
  await expect(
    page.getByRole("navigation", { name: "Candidate navigation" }),
  ).toBeVisible();
  await context.clearCookies({ name: /^(?!hirevelo-language$)/ });
  await page.goto("/register");
  await page.getByLabel("Name").fill("Duplicate candidate");
  await page.getByLabel("Email").fill(email.toUpperCase());
  await page.getByLabel(/^Password/).fill("Strong-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByLabel("Email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#email-error")).toHaveText(
    "An account with this email already exists.",
  );
});
test("wrong password returns a generic message; a later valid login succeeds", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("candidate1@example.com");
  await page.getByLabel(/^Password/).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Invalid email or password. Use the login that matches your account type.",
  );
  await page.getByLabel(/^Password/).fill("Demo-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/applications$/);
});
for (const role of ["candidate", "recruiter"] as const) {
  test(`${role} session persists, sign-out revokes saved cookies and blocks browser back`, async ({
    page,
    browser,
  }) => {
    await login(page, role);
    const protectedPath = role === "candidate" ? "/applications" : "/recruiter";
    await page.goto(protectedPath);
    await page.reload();
    const cookies = await page.context().cookies();
    const copied = await browser.newContext();
    await copied.addCookies(cookies);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/:3100\/$/);
    expect(
      await (
        await copied.request.get("http://127.0.0.1:3100/api/auth/session")
      ).json(),
    ).toBeNull();
    await page.goBack();
    await expect(
      page.getByRole("navigation", {
        name:
          role === "candidate"
            ? "Candidate navigation"
            : "Recruiter navigation",
      }),
    ).toHaveCount(0);
    await page.goto(protectedPath);
    await expect(page).toHaveURL(/\/(?:recruiter\/)?sign-in$/);
    await copied.close();
  });
}
test("direct URLs enforce both roles and permit public pages", async ({
  page,
  context,
}) => {
  for (const route of [
    "/applications",
    "/applications/private",
    "/recruiter",
    "/recruiter/jobs",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/(?:recruiter\/)?sign-in$/);
  }
  await page.goto("/careers");
  await expect(
    page.getByRole("heading", { name: "Careers", exact: true }),
  ).toBeVisible();
  await login(page, "candidate");
  await page.goto("/recruiter/jobs");
  await expect(
    page.getByRole("heading", { name: "Recruiter access required" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Recruiter navigation" }),
  ).toHaveCount(0);
  await page.goto("/applications");
  await expect(
    page.getByRole("heading", { name: "My applications", exact: true }),
  ).toBeVisible();
  await context.clearCookies({ name: /^(?!hirevelo-language$)/ });
  await login(page, "recruiter");
  await page.goto("/applications");
  await expect(
    page.getByRole("heading", { name: "Candidate access required" }),
  ).toBeVisible();
  await page.goto("/recruiter/jobs");
  await expect(
    page.getByRole("heading", { name: "Jobs", exact: true }),
  ).toBeVisible();
  await page.goto("/careers");
  await expect(
    page.getByRole("heading", { name: "Careers", exact: true }),
  ).toBeVisible();
});
test("eleventh failed credential request returns 429 and the form shows lockout", async ({
  page,
}) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const { csrfToken } = await (
      await page.request.get("/api/auth/csrf")
    ).json();
    const response = await page.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "candidate1@example.com",
        password: "wrong-password",
      },
      maxRedirects: 0,
    });
    expect(response.status()).not.toBe(429);
  }
  const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
  const blocked = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: "candidate1@example.com",
      password: "wrong-password",
    },
  });
  expect(blocked.status()).toBe(429);
  expect(blocked.headers()["retry-after"]).toBeDefined();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("candidate1@example.com");
  await page.getByLabel(/^Password/).fill("Demo-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Too many attempts. Please try again in 15 minutes.",
  );
});
test("auth forms meet accessibility and mobile layout requirements", async ({
  page,
}) => {
  for (const route of ["/sign-in", "/register"]) {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(route);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByRole("button", {
        name: route === "/register" ? "Create account" : "Sign in",
        exact: true,
      })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toBeFocused();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "/tmp/hirevelo-auth-mobile.png" });
});

test("role-specific login separates recruiter access from candidate registration", async ({
  page,
  context,
}) => {
  await page.goto("/recruiter");
  await expect(page).toHaveURL(/\/recruiter\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Recruiter sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Recruiter accounts are created by the operator.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByLabel("Email").fill("candidate1@example.com");
  await page.getByLabel(/^Password/).fill("Demo-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Use the login that matches your account type.",
  );
  await expect(page).toHaveURL(/\/recruiter\/sign-in$/);
  await page.getByLabel("Email").fill("recruiter@example.com");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/recruiter$/);
  await context.clearCookies({ name: /^(?!hirevelo-language$)/ });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("candidate1@example.com");
  await page.getByLabel(/^Password/).fill("Demo-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/applications$/);
  await context.clearCookies({ name: /^(?!hirevelo-language$)/ });
  await page.goto("/sign-in");
  await page
    .getByRole("link", { name: "Register", exact: true })
    .last()
    .click();
  await expect(
    page.getByText(
      "Create a candidate account to apply for jobs and track your applications.",
    ),
  ).toBeVisible();
});
