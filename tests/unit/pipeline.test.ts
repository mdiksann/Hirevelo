import { describe, expect, it } from "vitest";
import {
  STAGES,
  ACTIVE_STAGES,
  TERMINAL_STAGES,
  canTransition,
  isNoopTransition,
  validateTransition,
  stageLabel,
  stageOrder,
  stageTone,
} from "@/lib/pipeline";
import { moveStageSchema, noteSchema } from "@/lib/validation/pipeline";
const id = "clabcdefghij1234567890";
describe("pipeline matrix", () => {
  for (const from of STAGES)
    for (const to of STAGES) {
      const expected = !["HIRED", "REJECTED"].includes(from) && from !== to;
      it(`${from} → ${to}`, () => {
        expect(canTransition(from, to)).toBe(expected);
        expect(isNoopTransition(from, to)).toBe(from === to);
        expect(validateTransition(from, to, { jobArchived: false }).ok).toBe(
          expected,
        );
        expect(validateTransition(from, to, { jobArchived: true }).ok).toBe(
          false,
        );
      });
    }
  it("provides fixed presentation and stage sets", () => {
    expect([...ACTIVE_STAGES, ...TERMINAL_STAGES]).toEqual(STAGES);
    for (const [order, stage] of STAGES.entries()) {
      expect(stageOrder(stage)).toBe(order);
      expect(stageLabel(stage)).toBe(stage[0] + stage.slice(1).toLowerCase());
      expect(stageTone(stage)).toContain("bg-");
    }
  });
});
describe("pipeline validation", () => {
  it("requires a trimmed 3–500 character rejection reason", () => {
    for (const reason of [undefined, "", "   ", "ab", "x".repeat(501)]) {
      const result = moveStageSchema.safeParse({
        applicationId: id,
        toStage: "REJECTED",
        reason,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some((i) => i.path[0] === "reason")).toBe(
          true,
        );
    }
    for (const reason of ["abc", "x".repeat(500)])
      expect(
        moveStageSchema.parse({
          applicationId: id,
          toStage: "REJECTED",
          reason: ` ${reason} `,
        }).reason,
      ).toBe(reason);
    expect(
      moveStageSchema.parse({
        applicationId: id,
        toStage: "SCREENING",
        actorId: "forged",
      }),
    ).not.toHaveProperty("actorId");
    expect(
      moveStageSchema.safeParse({ applicationId: "bad", toStage: "FAKE" })
        .success,
    ).toBe(false);
    expect(
      moveStageSchema.safeParse({
        applicationId: id,
        toStage: "HIRED",
        comment: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });
  it("validates trimmed note boundaries", () => {
    for (const body of ["", "   ", "ab", "x".repeat(2001)])
      expect(noteSchema.safeParse({ applicationId: id, body }).success).toBe(
        false,
      );
    for (const body of ["abc", "x".repeat(2000)])
      expect(
        noteSchema.parse({ applicationId: id, body: ` ${body} ` }).body,
      ).toBe(body);
  });
});
