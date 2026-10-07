import "server-only";
import { prisma } from "@/lib/db";
import { signInSchema } from "@/lib/validation/auth";
import { compare } from "bcryptjs";

// A fixed cost-12 hash also performs password work for unknown accounts.
const dummyHash =
  "$2b$12$WvXw0HjxKvSoLm1ovYYnlO66HtYFEo2p7.lYqWL7EXPDHmUl9IjG6";
export async function verifyCredentials(input: unknown) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return null;
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });
  const valid = await compare(
    parsed.data.password,
    user?.passwordHash ?? dummyHash,
  );
  if (!user || !valid) return null;
  if (parsed.data.portal && user.role !== parsed.data.portal.toUpperCase())
    return null;
  return { id: user.id, role: user.role, name: user.name, email: user.email };
}
export async function getActiveAuthSession(sessionToken: string) {
  return prisma.session.findUnique({
    where: { sessionToken },
    select: { expires: true, user: { select: { id: true, role: true } } },
  });
}
export async function hasRecruiter() {
  return Boolean(
    await prisma.user.findFirst({
      where: { role: "RECRUITER" },
      select: { id: true },
    }),
  );
}

export async function getAuthRole(email: string) {
  return prisma.user.findUnique({
    where: { email: signInSchema.shape.email.parse(email) },
    select: { role: true },
  });
}
