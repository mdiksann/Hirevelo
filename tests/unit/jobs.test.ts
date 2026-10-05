import { describe, expect, it } from "vitest";
import { JOB_TRANSITIONS, canTransition, formatSalary } from "@/lib/jobs";
import {
  jobCreateSchema,
  jobUpdateSchema,
  jobStatuses,
  jobStatusSchema,
  jobListQuerySchema,
  slugify,
} from "@/lib/validation/jobs";
const valid = {
  title: "Product designer",
  description: "Design clear, usable products with our team.",
  location: "Jakarta",
  employmentType: "FULL_TIME",
};
describe("job validation", () => {
  it("trims text, strips unknown keys, and treats empty salaries as absent", () => {
    expect(
      jobCreateSchema.parse({
        ...valid,
        title: "  Product designer  ",
        status: "PUBLISHED",
        salaryMin: "",
        salaryMax: null,
      }),
    ).toEqual({ ...valid, salaryMin: undefined, salaryMax: undefined });
  });
  it.each([
    { title: "ab" },
    { title: "a".repeat(121) },
    { description: "a".repeat(19) },
    { description: "a".repeat(20001) },
    { location: "x" },
    { location: "x".repeat(121) },
    { employmentType: "OTHER" },
    { salaryMin: 0 },
    { salaryMin: -1 },
    { salaryMin: 1.5 },
    { salaryMin: 10_000_001 },
    { salaryMin: "oops" },
    { salaryMax: Infinity },
    { salaryMin: true },
  ])("rejects invalid input %j", (value) =>
    expect(jobCreateSchema.safeParse({ ...valid, ...value }).success).toBe(
      false,
    ),
  );
  it("accepts boundaries and maps the range error to salaryMax", () => {
    expect(
      jobCreateSchema.safeParse({
        ...valid,
        salaryMin: "1",
        salaryMax: "10000000",
      }).success,
    ).toBe(true);
    expect(
      jobCreateSchema.safeParse({ ...valid, salaryMin: 10, salaryMax: 10 })
        .success,
    ).toBe(true);
    const parsed = jobCreateSchema.safeParse({
      ...valid,
      salaryMin: 10,
      salaryMax: 9,
    });
    if (parsed.success) throw new Error("Expected invalid range");
    expect(parsed.error.issues[0]?.path).toEqual(["salaryMax"]);
    expect(jobCreateSchema.safeParse({ ...valid, salaryMax: 10 }).success).toBe(
      true,
    );
  });
  it("validates ids, statuses, and list boundaries", () => {
    expect(jobUpdateSchema.safeParse({ ...valid, id: "../bad" }).success).toBe(
      false,
    );
    expect(
      jobStatusSchema.safeParse({
        id: "clabcdefghij1234567890",
        status: "OTHER",
      }).success,
    ).toBe(false);
    expect(
      jobListQuerySchema.parse({ q: "  DESIGN  ", page: "2", status: "DRAFT" }),
    ).toMatchObject({ q: "DESIGN", page: 2 });
    for (const page of [true, ["2"], {}, "NaN", Infinity])
      expect(jobListQuerySchema.safeParse({ page }).success).toBe(false);
    expect(jobListQuerySchema.safeParse({ q: "a".repeat(121) }).success).toBe(
      false,
    );
  });
  it.each([
    ["  Développeur / Sénior  ", "developpeur-senior"],
    ["Hello___world!!", "hello-world"],
    ["日本語", "job"],
    ["", "job"],
    [" --- ", "job"],
  ])("slugifies %s", (value, result) => expect(slugify(value)).toBe(result));
});
describe("job lifecycle", () => {
  it("covers every status with archived terminal", () => {
    expect(Object.keys(JOB_TRANSITIONS).sort()).toEqual(
      [...jobStatuses].sort(),
    );
    expect(JOB_TRANSITIONS.ARCHIVED).toEqual([]);
  });
  const allowed = new Set([
    "DRAFT:PUBLISHED",
    "DRAFT:ARCHIVED",
    "PUBLISHED:CLOSED",
    "PUBLISHED:ARCHIVED",
    "CLOSED:PUBLISHED",
    "CLOSED:ARCHIVED",
  ]);
  for (const from of jobStatuses)
    for (const to of jobStatuses)
      it(`${from} → ${to}`, () =>
        expect(canTransition(from, to)).toBe(allowed.has(`${from}:${to}`)));
  it("formats optional salary ranges", () => {
    expect(formatSalary(null, null)).toBe("Salary not specified");
    expect(formatSalary(1000, null)).toBe("From 1,000");
    expect(formatSalary(null, 2000)).toBe("Up to 2,000");
    expect(formatSalary(1000, 2000)).toBe("1,000–2,000");
  });
});
