import { z } from "zod";
import { applicationIdSchema, stages } from "@/lib/validation/applications";
export const moveStageSchema = z
  .object({
    applicationId: applicationIdSchema,
    toStage: z.enum(stages),
    comment: z.string().trim().max(2000).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.toStage === "REJECTED" && (!v.reason || v.reason.length < 3))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Enter a rejection reason of 3–500 characters.",
      });
  });
export const noteSchema = z.object({
  applicationId: applicationIdSchema,
  body: z
    .string()
    .trim()
    .min(3, "Enter a note of 3–2000 characters.")
    .max(2000),
});
export type MoveStageInput = z.infer<typeof moveStageSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
