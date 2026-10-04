import "server-only";
import { prisma } from "@/lib/db";
export async function checkDatabase() {
  await prisma.user.count({ take: 1 });
}
