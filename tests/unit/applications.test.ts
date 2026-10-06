import { describe, expect, it } from "vitest";
import {
  applySchema,
  applicationListSchema,
  cvValidation,
  MAX_CV_BYTES,
  sanitizeFilename,
} from "@/lib/validation/applications";
import { returnToSchema } from "@/lib/validation/auth";
import { saveFile, readFile, removeFile } from "@/lib/files";
import { readUpload } from "@/lib/upload";
describe("application boundaries", () => {
  const valid = {
    jobId: "clabcdefghij1234567890",
    cvFileId: "clabcdefghij1234567891",
  };
  it("allows optional notes, enforces the limit before trimming and strips identity/stage", () => {
    expect(
      applySchema.parse({
        ...valid,
        coverNote: "  hello  ",
        candidateId: "foreign",
        stage: "HIRED",
      }),
    ).toEqual({ ...valid, coverNote: "hello" });
    expect(applySchema.safeParse(valid).success).toBe(true);
    expect(
      applySchema.safeParse({ ...valid, coverNote: "x".repeat(2001) }).success,
    ).toBe(false);
    expect(applySchema.safeParse({ ...valid, jobId: "bad" }).success).toBe(
      false,
    );
  });
  it("validates date ranges, stages and finite pagination", () => {
    expect(
      applicationListSchema.safeParse({
        dateFrom: "2026-10-05",
        dateTo: "2026-10-04",
      }).success,
    ).toBe(false);
    expect(
      applicationListSchema.safeParse({ dateFrom: "2026-02-30" }).success,
    ).toBe(false);
    expect(applicationListSchema.safeParse({ stage: "INVALID" }).success).toBe(
      false,
    );
    expect(applicationListSchema.safeParse({ page: "Infinity" }).success).toBe(
      false,
    );
  });
  it("allows only local apply return paths", () => {
    expect(returnToSchema.parse("/careers/software-engineer/apply")).toBe(
      "/careers/software-engineer/apply",
    );
    for (const path of [
      "https://evil.test",
      "//evil.test",
      "/careers/../apply",
      "/recruiter",
      "/careers/x/apply?url=evil",
    ])
      expect(returnToSchema.safeParse(path).success).toBe(false);
  });
  it("requires MIME/extension pairs and a non-empty file within 5 MB", () => {
    for (const [name, type] of [
      ["CV.PDF", "application/pdf"],
      ["cv.doc", "application/msword"],
      [
        "cv.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    ])
      expect(
        cvValidation({
          name: name ?? "",
          type: type ?? "",
          size: MAX_CV_BYTES,
        }),
      ).toBeNull();
    expect(
      cvValidation({ name: "evil.exe", type: "application/pdf", size: 1 }),
    ).toMatchObject({ status: 415 });
    expect(
      cvValidation({ name: "cv.pdf", type: "text/html", size: 1 }),
    ).toMatchObject({ status: 415 });
    expect(
      cvValidation({ name: "cv.pdf", type: "application/pdf", size: 0 }),
    ).toMatchObject({ status: 400 });
    expect(
      cvValidation({
        name: "cv.pdf",
        type: "application/pdf",
        size: MAX_CV_BYTES + 1,
      }),
    ).toMatchObject({ status: 413 });
  });
  it("strips path separators, quotes, control characters and unsafe header characters", () => {
    const name = sanitizeFilename('../a\\b"\r\n\0résumé.pdf');
    expect(name).not.toMatch(/[\\/"\r\n\0]/);
    expect(name).toBe("..abr_sum_.pdf");
    expect(sanitizeFilename('"\r\n')).toBe("cv");
  });
});
describe("CV storage", () => {
  it("generates paths independent of filenames and round-trips bytes", async () => {
    const file = new File(["%PDF-1.4 test"], "../../evil.pdf", {
      type: "application/pdf",
    });
    const a = await saveFile(file);
    const b = await saveFile(file);
    try {
      expect(a.key).toMatch(/^cv\/c[a-f0-9]{24}\.pdf$/);
      expect(a.key).not.toBe(b.key);
      expect((await readFile(a.key)).toString()).toBe("%PDF-1.4 test");
      await expect(readFile("../outside.pdf")).rejects.toMatchObject({
        code: "STORAGE_ERROR",
      });
    } finally {
      await removeFile(a.key);
      await removeFile(b.key);
    }
    await removeFile(a.key);
    await expect(readFile(a.key)).rejects.toMatchObject({ httpStatus: 404 });
  });
  it("bounds chunked bodies without trusting Content-Length", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_CV_BYTES + 65537));
        controller.close();
      },
    });
    const request = new Request("http://localhost/api/uploads/cv", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body,
      duplex: "half",
    } as RequestInit);
    await expect(readUpload(request)).rejects.toMatchObject({
      httpStatus: 413,
    });
  });
});
