"use server";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { AuthError as NextAuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getAuthRole } from "@/lib/queries/auth";
import { logger } from "@/lib/logger";
import { authIp, limitAuthAttempt } from "@/lib/rate-limit";
import { registerSchema, signInSchema } from "@/lib/validation/auth";
import { handleActionError, type ActionResult } from "@/types/action-result";

// Sign-in and registration are deliberately public entry points; requireSession would prevent authentication.
export async function registerCandidate(
  input: unknown,
): Promise<ActionResult<null>> {
  let requestId = crypto.randomUUID();
  try {
    const requestHeaders = await headers();
    requestId = requestHeaders.get("x-request-id") ?? requestId;
    limitAuthAttempt(authIp(requestHeaders));
    const parsed = registerSchema.parse(input);
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash: await hash(parsed.password, 12),
        role: "CANDIDATE",
      },
      select: { id: true },
    });
    logger.info("candidate_registered", {
      actorId: user.id,
      requestId,
    });
    await signIn("credentials", {
      email: parsed.email,
      password: parsed.password,
      redirect: false,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      logger.warn("registration_conflict", { requestId, code: "CONFLICT" });
      return {
        ok: false,
        message: "An account with this email already exists.",
        errors: { email: ["An account with this email already exists."] },
      };
    }
    return handleActionError(error, requestId);
  }
  redirect("/");
}
export async function signInAction(
  input: unknown,
): Promise<ActionResult<null>> {
  let destination = "/";
  let requestId = crypto.randomUUID();
  try {
    const requestHeaders = await headers();
    requestId = requestHeaders.get("x-request-id") ?? requestId;
    limitAuthAttempt(authIp(requestHeaders));
    const parsed = signInSchema.parse(input);
    await signIn("credentials", { ...parsed, redirect: false });
    const user = await getAuthRole(parsed.email);
    destination = user?.role === "RECRUITER" ? "/recruiter" : "/";
  } catch (error) {
    if (error instanceof NextAuthError)
      return { ok: false, message: "Invalid email or password." };
    return handleActionError(error, requestId);
  }
  redirect(destination);
}
export async function signOutAction(): Promise<ActionResult<null>> {
  try {
    await requireSession();
    await signOut({ redirect: false });
  } catch (error) {
    return handleActionError(error);
  }
  redirect("/");
}
