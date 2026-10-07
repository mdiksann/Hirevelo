import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTranslator } from "@/lib/i18n";
import { AuthError, RateLimitError, StorageError } from "@/lib/errors";
import { readUpload } from "@/lib/upload";
import { MAX_CV_BYTES, sanitizeFilename } from "@/lib/validation/applications";
import { fieldErrors, handleActionError } from "@/types/action-result";
import { logger } from "@/lib/logger";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "en" }) }),
}));
import { getLocale, getTranslator } from "@/lib/i18n/server";
afterEach(() => vi.restoreAllMocks());
it("server locale and translator use the validated cookie", async () => {
  expect(await getLocale()).toBe("en");
  expect((await getTranslator())("My applications")).toBe("My applications");
});
it.each([
  ["String must contain at most 20 character(s)", "Teks maksimal 20 karakter."],
  ["Number must be greater than 0", "Angka harus lebih dari 0."],
  ["Number must be less than or equal to 100", "Angka maksimal 100."],
  ["Invalid email", "Format data tidak valid."],
  ["Invalid enum value. Expected A", "Pilih nilai yang valid."],
  ["Invalid input: wrong type", "Pilih nilai yang valid."],
  ["Expected integer, received float", "Masukkan angka bulat."],
  ["Required", "Wajib diisi."],
  [
    "Expected number, received string",
    "Masukkan data dengan format yang sesuai.",
  ],
])("translates validation fallback %s", (input, expected) => {
  expect(createTranslator("id")(input)).toBe(expected);
});
it("preserves non-string values and unknown interpolation parameters", () => {
  expect(createTranslator("id")(42)).toBe(42);
  expect(
    createTranslator("en")("Hello {name} {missing}", { name: "Candidate" }),
  ).toBe("Hello Candidate {missing}");
});
it("returns safe auth, rate-limit, storage and unknown Prisma errors", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  for (const error of [
    new AuthError(),
    new RateLimitError(60),
    new StorageError(),
  ])
    expect(handleActionError(error)).toMatchObject({
      ok: false,
      status: error.httpStatus,
      message: error.message,
    });
  const error = new Prisma.PrismaClientKnownRequestError("private SQL", {
    code: "P9999",
    clientVersion: "6",
  });
  expect(handleActionError(error)).toEqual({
    ok: false,
    message: "Something went wrong. Please try again.",
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain("private SQL");
});
it("groups multiple errors at the form path and sanitizes log events", () => {
  expect(
    fieldErrors(
      new z.ZodError([
        { code: "custom", path: [], message: "First" },
        { code: "custom", path: [], message: "Second" },
      ]),
    ),
  ).toEqual({ _form: ["First", "Second"] });
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  logger.info("private@example.com", {
    code: "SAFE",
    actorId: { password: "secret" },
  });
  expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({
    event: "application_event",
    code: "SAFE",
  });
  expect(JSON.stringify(info.mock.calls)).not.toMatch(
    /private|password|secret/,
  );
});
it("bounds and sanitizes download names", () => {
  expect(sanitizeFilename('\u0000/\\"\n')).toBe("cv");
  expect(sanitizeFilename("a".repeat(255))).toHaveLength(180);
  expect(sanitizeFilename("résumé.pdf")).toBe("r_sum_.pdf");
});
it("rejects oversized declared and streamed multipart bodies before decoding", async () => {
  await expect(
    readUpload(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "content-length": String(MAX_CV_BYTES + 65537),
          "content-type": "multipart/form-data; boundary=test",
        },
      }),
    ),
  ).rejects.toMatchObject({ httpStatus: 413 });
  const cancel = vi.fn();
  const request = new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=test" },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_CV_BYTES + 65537));
      },
      cancel,
    }),
    duplex: "half",
  } as RequestInit);
  await expect(readUpload(request)).rejects.toMatchObject({ httpStatus: 413 });
  expect(cancel).toHaveBeenCalledOnce();
});
it("rejects missing body, invalid content type, and malformed multipart", async () => {
  await expect(
    readUpload(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=test" },
      }),
    ),
  ).rejects.toMatchObject({ httpStatus: 400 });
  await expect(
    readUpload(
      new Request("http://localhost", { method: "POST", body: "bad" }),
    ),
  ).rejects.toMatchObject({ httpStatus: 400 });
  await expect(
    readUpload(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=test" },
        body: "malformed",
      }),
    ),
  ).rejects.toMatchObject({ message: "The upload could not be read." });
});
it("decodes a valid multipart CV body", async () => {
  const data = new FormData();
  data.set("jobId", "clabcdefghij1234567890");
  data.set(
    "file",
    new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" }),
  );
  const request = new Request("http://localhost", {
    method: "POST",
    body: data,
  });
  const decoded = await readUpload(request);
  expect(decoded.get("jobId")).toBe("clabcdefghij1234567890");
  expect(decoded.get("file")).toBeInstanceOf(File);
});
