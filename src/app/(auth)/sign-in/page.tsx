import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountAccess } from "@/components/auth/account-access";
import { AuthForm } from "@/components/auth/auth-form";
import { returnToSchema } from "@/lib/validation/auth";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.portal === "recruiter") redirect("/recruiter/sign-in");
  const parsed = returnToSchema.safeParse(params.returnTo);
  const session = await auth();
  if (session && session.user.role !== "CANDIDATE")
    return <AccountAccess portal="candidate" />;
  return (
    <AuthForm
      returnTo={parsed.success ? parsed.data : undefined}
      portal="candidate"
    />
  );
}
