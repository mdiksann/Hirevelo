import { z } from "zod";

export const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => /^postgres(?:ql)?:\/\//.test(value),
        "Must be a PostgreSQL URL",
      ),
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z
      .string()
      .url()
      .refine((value) => /^https?:\/\//.test(value), "Must be an HTTP(S) URL"),
    STORAGE_DIR: z.string().trim().min(1),
    SEED_RECRUITER_EMAIL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().trim().toLowerCase().email().optional(),
    ),
    SEED_RECRUITER_PASSWORD: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .string()
        .min(8)
        .max(72)
        .refine(
          (value) => new TextEncoder().encode(value).length <= 72,
          "Password must be at most 72 bytes",
        )
        .optional(),
    ),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  })
  .superRefine((value, context) => {
    if (
      Boolean(value.SEED_RECRUITER_EMAIL) !==
      Boolean(value.SEED_RECRUITER_PASSWORD)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SEED_RECRUITER_PASSWORD"],
        message: "Provide both recruiter seed variables",
      });
    }
  });

export function validateEnv(input: unknown) {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
    );
  }
  return {
    ...result.data,
    LOG_LEVEL:
      result.data.LOG_LEVEL ??
      (result.data.NODE_ENV === "production" ? "info" : "debug"),
  };
}

export const env = validateEnv(process.env);
