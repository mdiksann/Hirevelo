import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
type Props = { title: string };
export function FoundationPage({ title }: Props) {
  const tabs =
    title === "Jobs"
      ? [{ label: "All", href: "/recruiter/jobs", active: true }]
      : undefined;
  return (
    <>
      <PageHeader title={title} tabs={tabs} />
      <section className="rounded-panel border border-border-subtle bg-surface">
        <EmptyState
          title="Nothing here yet"
          message="This area will be available soon."
        />
      </section>
    </>
  );
}
