import { z } from "zod";
import { notFound } from "next/navigation";
import { FoundationPage } from "@/components/shared/foundation-page";
type Props = { params: Promise<{ placeholder: string[] }> };
export default async function Page({ params }: Props) {
  const path = (await params).placeholder.join("/");
  const titles: Record<string, string> = {
    jobs: "Jobs",
    candidates: "Candidates",
    "jobs/new": "New job",
    dashboard: "Dashboard",
  };
  const parsed = z
    .enum(["jobs", "candidates", "jobs/new", "dashboard"])
    .safeParse(path);
  if (!parsed.success) notFound();
  const title = titles[parsed.data];
  if (!title) notFound();
  return <FoundationPage title={title} />;
}
