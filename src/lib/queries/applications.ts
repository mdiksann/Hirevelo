import "server-only";
import type { Prisma } from "@prisma/client";
import { requireCandidate, requireRecruiter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { jobListQuerySchema } from "@/lib/validation/jobs";
import { paginate } from "@/lib/types/pagination";
import {
  applicationListSchema,
  applicationIdSchema,
  type Stage,
} from "@/lib/validation/applications";
export type ApplicationDto = {
  id: string;
  stage: Stage;
  appliedAt: string;
  stageUpdatedAt: string;
  job: { id: string; title: string; location: string; slug: string };
};
export type ApplicationDetailDto = ApplicationDto & {
  coverNote: string | null;
  rejectionReason: string | null;
  cvFile: { id: string; originalName: string };
};
export type RecruiterApplicationDto = ApplicationDetailDto & {
  candidate: { id: string; name: string; email: string };
  lastActivityAt: string;
};
const summarySelect = {
  id: true,
  stage: true,
  appliedAt: true,
  stageUpdatedAt: true,
  job: { select: { id: true, title: true, location: true, slug: true } },
} as const;
const detailSelect = {
  ...summarySelect,
  coverNote: true,
  rejectionReason: true,
  cvFile: { select: { id: true, originalName: true } },
} as const;
const recruiterSelect = {
  ...detailSelect,
  candidate: { select: { id: true, name: true, email: true } },
  activities: {
    select: { createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
  },
} satisfies Prisma.ApplicationSelect;
function summary(row: {
  id: string;
  stage: Stage;
  appliedAt: Date;
  stageUpdatedAt: Date;
  job: ApplicationDto["job"];
}): ApplicationDto {
  return {
    id: row.id,
    stage: row.stage,
    appliedAt: row.appliedAt.toISOString(),
    stageUpdatedAt: row.stageUpdatedAt.toISOString(),
    job: row.job,
  };
}
export async function getMyApplications(input: unknown = {}) {
  const session = await requireCandidate();
  const params = jobListQuerySchema
    .pick({ page: true, pageSize: true })
    .parse(input);
  const pagination = paginate(params);
  const where = { candidateId: session.user.id };
  const [total, rows] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      select: summarySelect,
      skip: Math.min(pagination.skip, 2_147_483_647),
      take: pagination.take,
      orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
    }),
  ]);
  return {
    items: rows.map(summary),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}
export async function getMyApplication(
  input: unknown,
): Promise<ApplicationDetailDto | null> {
  const session = await requireCandidate();
  const id = applicationIdSchema.parse(input);
  const row = await prisma.application.findUnique({
    where: { id, candidateId: session.user.id },
    select: detailSelect,
  });
  return row
    ? {
        ...summary(row),
        coverNote: row.coverNote,
        rejectionReason: row.rejectionReason,
        cvFile: row.cvFile,
      }
    : null;
}
export async function searchApplications(input: unknown = {}) {
  await requireRecruiter();
  const params = applicationListSchema.parse(input);
  const pagination = paginate(params);
  const where = {
    ...(params.jobId ? { jobId: params.jobId } : {}),
    ...(params.stage ? { stage: params.stage } : {}),
    ...(params.q
      ? {
          candidate: {
            OR: [
              { name: { contains: params.q, mode: "insensitive" as const } },
              { email: { contains: params.q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
    ...(params.dateFrom || params.dateTo
      ? {
          appliedAt: {
            ...(params.dateFrom
              ? { gte: new Date(`${params.dateFrom}T00:00:00.000Z`) }
              : {}),
            ...(params.dateTo
              ? { lte: new Date(`${params.dateTo}T23:59:59.999Z`) }
              : {}),
          },
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      select: recruiterSelect,
      skip: Math.min(pagination.skip, 2_147_483_647),
      take: pagination.take,
      orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
    }),
  ]);
  const items: RecruiterApplicationDto[] = rows.map((row) => ({
    ...summary(row),
    candidate: row.candidate,
    coverNote: row.coverNote,
    rejectionReason: row.rejectionReason,
    cvFile: row.cvFile,
    lastActivityAt: (
      row.activities[0]?.createdAt ?? row.appliedAt
    ).toISOString(),
  }));
  return { items, total, page: pagination.page, pageSize: pagination.pageSize };
}
export async function getApplicationForRecruiter(
  input: unknown,
): Promise<RecruiterApplicationDto | null> {
  await requireRecruiter();
  const id = applicationIdSchema.parse(input);
  const row = await prisma.application.findUnique({
    where: { id },
    select: recruiterSelect,
  });
  return row
    ? {
        ...summary(row),
        candidate: row.candidate,
        coverNote: row.coverNote,
        rejectionReason: row.rejectionReason,
        cvFile: row.cvFile,
        lastActivityAt: (
          row.activities[0]?.createdAt ?? row.appliedAt
        ).toISOString(),
      }
    : null;
}
