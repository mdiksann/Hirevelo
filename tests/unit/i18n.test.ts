import { expect, it } from "vitest";
import { createTranslator, parseLocale } from "@/lib/i18n";
import { formatSalary } from "@/lib/jobs";
import { formatDate } from "@/lib/utils";
it("validates the language cookie and defaults to Indonesian", () => {
  expect(parseLocale(undefined)).toBe("id");
  expect(parseLocale("unsupported")).toBe("id");
  expect(parseLocale("en")).toBe("en");
});
it("translates labels, preserves spacing and interpolates user content without translating it", () => {
  const t = createTranslator("id");
  expect(t("My applications")).toBe("Lamaran saya");
  expect(t("Apply for {title}", { title: "Interview" })).toBe(
    "Lamar untuk Interview",
  );
  expect(t(" · Posted {date}", { date: "6 Okt 2026" })).toBe(
    " · Dipublikasikan 6 Okt 2026",
  );
  expect(t("Unknown user text")).toBe("Unknown user text");
  expect(t("constructor")).toBe("constructor");
  expect(t("__proto__")).toBe("__proto__");
  expect(t("String must contain at least 3 character(s)")).toBe(
    "Teks minimal 3 karakter.",
  );
});
it("keeps English copy and formats dates in the selected language", () => {
  expect(
    createTranslator("en")("Apply for {title}", { title: "Designer" }),
  ).toBe("Apply for Designer");
  expect(formatDate("2026-10-06", "id")).toBe("6 Okt 2026");
  expect(formatDate("2026-10-06", "en")).toBe("Oct 6, 2026");
});

it("localizes salary bounds without inventing a currency", () => {
  expect(formatSalary(1000, null, "id")).toBe("Mulai 1.000");
  expect(formatSalary(null, 2000, "id")).toBe("Hingga 2.000");
  expect(formatSalary(null, null, "id")).toBe("Gaji belum dicantumkan");
});
