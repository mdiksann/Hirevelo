import "server-only";
import { z } from "zod";
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
const listSchema = z.object({
  q: z.string().trim().max(120).default(""),
  page: z.number().finite().optional(),
  pageSize: z.number().finite().optional(),
});
export async function getPublishedJobs(input: unknown = {}) {
  const params = listSchema.parse(input);
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
  const slug = z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .parse(input);
  const job = await prisma.job.findUnique({
    where: { slug, status: "PUBLISHED" },
    select,
  });
  return job ? toJobDto(job) : null;
}
