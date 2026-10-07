import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireRecruiter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { STAGES } from "@/lib/pipeline";
import { activityDetails, type ActivityDto } from "@/lib/activity";
import type { Stage } from "@/lib/validation/applications";
export type DashboardStatsDto = {
  publishedJobs: number;
  totalCandidates: number;
  applicationsByStage: Record<Stage, number>;
  appliedLast7Days: number;
};
export type RecentActivityDto = ActivityDto & {
  job: { id: string; title: string } | null;
  application: { id: string; candidate: { name: string } } | null;
};
const limitSchema = z.number().int().min(1).max(10);
export async function getDashboardStats(): Promise<DashboardStatsDto> {
  await requireRecruiter();
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const stageCounts = prisma.application.groupBy({
    by: ["stage"],
    _count: { _all: true },
    orderBy: { stage: "asc" },
  });
  const [publishedJobs, totalCandidates, grouped, appliedLast7Days] =
    await prisma.$transaction(
      [
        prisma.job.count({ where: { status: "PUBLISHED" } }),
        prisma.user.count({ where: { role: "CANDIDATE" } }),
        stageCounts,
        prisma.application.count({
          where: { appliedAt: { gte: since, lte: now } },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  const applicationsByStage: Record<Stage, number> = {
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    OFFERING: 0,
    HIRED: 0,
    REJECTED: 0,
  };
  for (const stage of STAGES)
    applicationsByStage[stage] =
      grouped.find((row) => row.stage === stage)?._count._all ?? 0;
  return {
    publishedJobs,
    totalCandidates,
    applicationsByStage,
    appliedLast7Days,
  };
}
export async function getRecentActivity(
  input: unknown = 10,
): Promise<RecentActivityDto[]> {
  await requireRecruiter();
  const limit = limitSchema.parse(input);
  const rows = await prisma.activity.findMany({
    take: limit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      type: true,
      createdAt: true,
      data: true,
      actor: { select: { name: true } },
      job: { select: { id: true, title: true } },
      application: {
        select: { id: true, candidate: { select: { name: true } } },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    actor: row.actor.name,
    createdAt: row.createdAt.toISOString(),
    ...activityDetails(row.data),
    job: row.job,
    application: row.application,
  }));
}
