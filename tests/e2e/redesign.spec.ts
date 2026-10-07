import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { isolateIp, login } from "./auth-helpers";
test.beforeEach(async ({ context, page }) => {
  await isolateIp(context);
  // Check final content contrast; scroll animations have their own browser test.
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("Indonesian is server rendered by default and English persists across navigation", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  const response = await page.goto("/");
  expect(await response!.text()).toContain('lang="id"');
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cara lebih baik untuk merekrut, bersama.",
  );
  await page
    .getByRole("combobox", { name: "Bahasa", exact: true })
    .selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A better way to hire, together.",
  );
  await page
    .getByRole("navigation", { name: "Public navigation" })
    .getByRole("link", { name: "Careers", exact: true })
    .click();
  await expect(page).toHaveURL(/\/careers$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Careers");
  await expect(
    page.getByRole("combobox", { name: "Language", exact: true }),
  ).toHaveValue("en");
});

test("public and auth layouts fit phone, tablet and desktop in both languages", async ({
  page,
}) => {
  for (const locale of ["id", "en"] as const) {
    await page.context().addCookies([
      {
        name: "hirevelo-language",
        value: locale,
        url: "http://127.0.0.1:3100",
      },
    ]);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [
        "/",
        "/careers",
        "/register",
        "/sign-in",
        "/recruiter/sign-in",
      ]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${path}, ${locale}, ${width}px`,
        ).toBe(true);
      }
    }
  }
  for (const path of ["/", "/careers", "/register"]) {
    await page.goto(path);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});

test("recruiter language switching preserves session and forms show Indonesian validation", async ({
  page,
}) => {
  await login(page, "recruiter");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("id");
  await expect(
    page.getByRole("navigation", { name: "Navigasi recruiter" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Lowongan baru", exact: true }).click();
  await page.getByRole("button", { name: "Simpan sebagai draf" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Periksa kembali data",
  );
  await expect(page.locator("#title-error")).toContainText(
    "minimal 3 karakter",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Kandidat", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Kandidat" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
