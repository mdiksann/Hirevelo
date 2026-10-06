import { AuthForm } from "@/components/auth/auth-form";
import { returnToSchema } from "@/lib/validation/auth";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = returnToSchema.safeParse((await searchParams).returnTo);
  return <AuthForm returnTo={parsed.success ? parsed.data : undefined} />;
}
