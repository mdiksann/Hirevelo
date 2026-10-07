import { auth } from "@/lib/auth";
import { AccountAccess } from "@/components/auth/account-access";
import { AuthForm } from "@/components/auth/auth-form";

export default async function Page() {
  const session = await auth();
  if (session && session.user.role !== "RECRUITER")
    return <AccountAccess portal="recruiter" />;
  return <AuthForm portal="recruiter" />;
}
