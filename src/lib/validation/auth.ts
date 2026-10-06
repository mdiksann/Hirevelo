import { z } from "zod";
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);
const password = z
  .string()
  .min(1, "Enter your password.")
  .max(72, "Password must be at most 72 characters.");
const byteLimit = (value: string) =>
  new TextEncoder().encode(value).length <= 72;
export const returnToSchema = z
  .string()
  .regex(/^\/careers\/[a-z0-9]+(?:-[a-z0-9]+)*\/apply$/)
  .max(180);
export const signInSchema = z.object({
  email,
  returnTo: returnToSchema.optional(),
  password: password.refine(byteLimit, "Password must be at most 72 bytes."),
});
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(80),
  email,
  returnTo: returnToSchema.optional(),
  password: password
    .min(8, "Password must contain at least 8 characters.")
    .regex(/[a-zA-Z]/, "Include a letter.")
    .regex(/[0-9]/, "Include a number.")
    .refine(byteLimit, "Password must be at most 72 bytes."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
