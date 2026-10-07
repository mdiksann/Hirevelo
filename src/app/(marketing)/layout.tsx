import { auth } from "@/lib/auth";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/shared/public-header";
import { PublicFooter } from "@/components/shared/public-footer";
import { getTranslator } from "@/lib/i18n/server";
export default async function Layout({ children }: { children: ReactNode }) {
  const session = await auth();
  const t = await getTranslator();
  return (
    <div className="public-site">
      <a className="skip-link" href="#main-content">
        {t("Skip to content")}
      </a>
      <PublicHeader role={session?.user.role} />
      <main id="main-content" className="public-content" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
