import "server-only";
import { requireCandidate, requireRecruiter } from "@/lib/auth-helpers";
import {
  jobIdSchema,
  jobListQuerySchema,
  jobSlugSchema,
} from "@/lib/validation/jobs";
import { prisma } from "@/lib/db";
import { paginate } from "@/lib/types/pagination";

const select = {
  id: true,
  slug: true,
  title: true,
  description: true,
  location: true,
  employmentType: true,
  salaryMin: true,
  salaryMax: true,
  publishedAt: true,
} as const;
type JobRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: Date | null;
};
export type JobDto = Omit<JobRow, "publishedAt"> & {
  publishedAt: string | null;
};
export function toJobDto(job: JobRow): JobDto {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    description: job.description,
    location: job.location,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    publishedAt: job.publishedAt?.toISOString() ?? null,
  };
}
export async function getPublishedJobs(input: unknown = {}) {
  const params = jobListQuerySchema.parse(input);
  const pagination = paginate(params);
  const where = {
    status: "PUBLISHED" as const,
    ...(params.q
      ? { title: { contains: params.q, mode: "insensitive" as const } }
      : {}),
  };
  // An extremely high page is still bounded without passing an overflowing offset to Postgres.
  const [total, rows] = await prisma.$transaction([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      select,
      skip: Math.min(pagination.skip, 2_147_483_647),
      take: pagination.take,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    }),
  ]);
  return {
    items: rows.map(toJobDto),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}
export async function getJobBySlug(input: unknown): Promise<JobDto | null> {
  const slug = jobSlugSchema.parse(input);
  const job = await prisma.job.findUnique({
    where: { slug, status: "PUBLISHED" },
    select,
  });
  return job ? toJobDto(job) : null;
}

export const jobSelect = {
  ...select,
  status: true,
  updatedAt: true,
  _count: { select: { applications: true } },
} as const;
type RecruiterJobRow = JobRow & {
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  updatedAt: Date;
  _count: { applications: number };
};
export type RecruiterJobDto = JobDto & {
  status: RecruiterJobRow["status"];
  updatedAt: string;
  applicantsCount: number;
};
export function toRecruiterJobDto(job: RecruiterJobRow): RecruiterJobDto {
  return {
    ...toJobDto(job),
    status: job.status,
    updatedAt: job.updatedAt.toISOString(),
    applicantsCount: job._count.applications,
  };
}
export async function getJobsForRecruiter(input: unknown = {}) {
  await requireRecruiter();
  const params = jobListQuerySchema.parse(input);
  const pagination = paginate(params);
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? { title: { contains: params.q, mode: "insensitive" as const } }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      select: jobSelect,
      skip: Math.min(pagination.skip, 2_147_483_647),
      take: pagination.take,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }),
  ]);
  return {
    items: rows.map(toRecruiterJobDto),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}
export async function getJobForRecruiter(input: unknown) {
  await requireRecruiter();
  const id = jobIdSchema.parse(input);
  const row = await prisma.job.findUnique({ where: { id }, select: jobSelect });
  return row ? toRecruiterJobDto(row) : null;
}
export async function hasAppliedToJob(input: unknown) {
  const session = await requireCandidate();
  const jobId = jobIdSchema.parse(input);
  return Boolean(
    await prisma.application.findUnique({
      where: {
        jobId_candidateId: { jobId, candidateId: session.user.id },
        job: { status: "PUBLISHED" },
      },
      select: { id: true },
    }),
  );
}
