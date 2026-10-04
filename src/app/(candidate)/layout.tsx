import type { ReactNode } from "react";
import { AppShell } from "@/components/shared/app-shell";
type Props = { children: ReactNode };
export default async function Layout({ children }: Props) {
  return <AppShell role="candidate">{children}</AppShell>;
}
