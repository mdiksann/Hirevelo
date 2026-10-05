import { requireRecruiter } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { JobForm } from "@/components/jobs/job-form";
export default async function Page() {
  await requireRecruiter();
  return (
    <>
      <PageHeader title="New job" />
      <JobForm />
    </>
  );
}
