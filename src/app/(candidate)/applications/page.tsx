import { getTranslator } from "@/lib/i18n/server";
import Link from "next/link";
import { getMyApplications } from "@/lib/queries/applications";
import { applicationListSchema } from "@/lib/validation/applications";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ApplicationTable } from "@/components/applications/application-table";
import { ApplicationPagination } from "@/components/applications/application-pagination";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslator();
  const parsed = applicationListSchema.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <>
        <PageHeader title={t("My applications")} />
        <EmptyState
          title={t("Invalid filters")}
          message={t("Reset the filters and try again.")}
          action={<Link href="/applications">{t("Reset filters")}</Link>}
        />
      </>
    );
  const result = await getMyApplications({ page: parsed.data.page });
  return (
    <>
      <PageHeader title={t("My applications")} />
      {result.items.length ? (
        <ApplicationTable applications={result.items} />
      ) : (
        <EmptyState
          title={t("No applications yet")}
          message={t("Browse open jobs and submit your first application.")}
          action={
            <Link href="/careers" className="text-accent-ink">
              {t("Browse careers")}
            </Link>
          }
        />
      )}
      <ApplicationPagination path="/applications" {...result} />
    </>
  );
}
