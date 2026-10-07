import { expect, it, vi } from "vitest";
import { createTranslator } from "@/lib/i18n";
vi.mock("@/lib/i18n/server", () => ({
  getTranslator: async () => createTranslator("en"),
}));
vi.mock("@/lib/queries/jobs", () => ({ getPublishedJobs: vi.fn() }));
import { getPublishedJobs } from "@/lib/queries/jobs";
import Page from "@/app/(marketing)/careers/page";

it("waits for a slow jobs query before rendering the public page", async () => {
  let finish:
    ((value: Awaited<ReturnType<typeof getPublishedJobs>>) => void) | undefined;
  vi.mocked(getPublishedJobs).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let rendered = false;
  const page = Page({
    searchParams: Promise.resolve({ q: "designer", page: "1" }),
  }).then((result) => {
    rendered = true;
    return result;
  });
  await vi.waitFor(() =>
    expect(getPublishedJobs).toHaveBeenCalledWith({ q: "designer", page: 1 }),
  );
  expect(rendered).toBe(false);
  if (!finish) throw new Error("Query did not start");
  finish({ items: [], total: 0, page: 1, pageSize: 20 });
  expect(await page).toBeDefined();
  expect(rendered).toBe(true);
});
