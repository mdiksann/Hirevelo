import { getTranslator } from "@/lib/i18n/server";
import { requireRecruiter } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { JobForm } from "@/components/jobs/job-form";
export default async function Page() {
  const t = await getTranslator();
  await requireRecruiter();
  return (
    <>
      <PageHeader title={t("New job")} />
      <JobForm />
    </>
  );
}
