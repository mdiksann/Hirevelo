"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  LanguageSwitcher,
  useTranslator,
} from "@/components/i18n/language-provider";
export function PublicHeader({ role }: { role?: string }) {
  const pathname = usePathname();
  const t = useTranslator();
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Brand />
        <nav aria-label={t("Public navigation")}>
          <Link
            href="/careers"
            aria-current={pathname.startsWith("/careers") ? "page" : undefined}
          >
            {t("Careers")}
          </Link>
          {role ? (
            <>
              <Link
                href={role === "RECRUITER" ? "/recruiter" : "/applications"}
              >
                {t(role === "RECRUITER" ? "Dashboard" : "My applications")}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/sign-in">{t("Sign in")}</Link>
              <Link href="/register" className="header-cta">
                {t("Create account")}
              </Link>
            </>
          )}
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
