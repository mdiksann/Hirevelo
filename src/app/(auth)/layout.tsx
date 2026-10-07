import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "@/components/shared/brand";
import { LanguageSwitcher } from "@/components/i18n/language-provider";
import { getTranslator } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
export default async function Layout({ children }: { children: ReactNode }) {
  const t = await getTranslator();
  return (
    <div className="auth-layout">
      <header className="auth-header">
        <Brand />
        <nav aria-label={t("Account navigation")} className="auth-nav">
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft aria-hidden="true" />
              {t("Back")}
            </Link>
          </Button>
        </nav>
        <LanguageSwitcher />
      </header>
      <main id="main-content" className="auth-main">
        <div className="auth-form-panel">{children}</div>
      </main>
    </div>
  );
}
