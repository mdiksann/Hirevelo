import "server-only";
import { activityDetails, type ActivityDto } from "@/lib/activity";
export type { ActivityDto } from "@/lib/activity";
import { requireRecruiter, requireCandidate } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { applicationIdSchema } from "@/lib/validation/applications";
import { jobListQuerySchema } from "@/lib/validation/jobs";
import { paginate } from "@/lib/types/pagination";
const pageSchema = jobListQuerySchema.pick({ page: true, pageSize: true });
export async function getApplicationActivity(
  input: unknown,
  paging: unknown = {},
) {
  await requireRecruiter();
  const id = applicationIdSchema.parse(input);
  if (
    !(await prisma.application.findUnique({
      where: { id },
      select: { id: true },
    }))
  )
    throw new NotFoundError();
  return readActivity(id, false, paging);
}
export async function getCandidateActivity(
  input: unknown,
  paging: unknown = {},
) {
  const session = await requireCandidate();
  const id = applicationIdSchema.parse(input);
  if (
    !(await prisma.application.findUnique({
      where: { id, candidateId: session.user.id },
      select: { id: true },
    }))
  )
    throw new NotFoundError();
  return readActivity(id, true, paging);
}
async function readActivity(id: string, candidate: boolean, paging: unknown) {
  const p = paginate(pageSchema.parse(paging));
  const types: ActivityDto["type"][] = candidate
    ? ["APPLICATION_CREATED", "STAGE_CHANGED"]
    : ["APPLICATION_CREATED", "STAGE_CHANGED", "NOTE_ADDED"];
  const where = { applicationId: id, type: { in: types } };
  const direction = candidate ? "asc" : "desc";
  const [total, rows] = await prisma.$transaction([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      select: {
        id: true,
        type: true,
        createdAt: true,
        data: true,
        ...(!candidate ? { actor: { select: { name: true } } } : {}),
      },
      orderBy: [{ createdAt: direction }, { id: direction }],
      skip: Math.min(p.skip, 2147483647),
      take: p.take,
    }),
  ]);
  const items: ActivityDto[] = rows.map((row) => {
    const details = activityDetails(row.data);
    return {
      id: row.id,
      type: row.type as ActivityDto["type"],
      createdAt: row.createdAt.toISOString(),
      actor: candidate
        ? row.type === "APPLICATION_CREATED"
          ? "You"
          : "Recruiter"
        : (row.actor?.name ?? "Recruiter"),
      from: details.from,
      to: details.to,
      comment: candidate ? null : details.comment,
    };
  });
  return { items, total, page: p.page, pageSize: p.pageSize };
}
export async function getApplicationNotes(
  input: unknown,
  paging: unknown = {},
) {
  await requireRecruiter();
  const id = applicationIdSchema.parse(input);
  const p = paginate(pageSchema.parse(paging));
  if (
    !(await prisma.application.findUnique({
      where: { id },
      select: { id: true },
    }))
  )
    throw new NotFoundError();
  const where = { applicationId: id };
  const [total, rows] = await prisma.$transaction([
    prisma.note.count({ where }),
    prisma.note.findMany({
      where,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: Math.min(p.skip, 2147483647),
      take: p.take,
    }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      body: row.body,
      author: row.author.name,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page: p.page,
    pageSize: p.pageSize,
  };
}
