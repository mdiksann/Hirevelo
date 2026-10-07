"use client";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { useTranslator } from "@/components/i18n/language-provider";
export function PublicFooter() {
  const t = useTranslator();
  return (
    <footer className="public-footer">
      <div>
        <Brand />
        <p>{t("A simple, connected space for recruiters and candidates.")}</p>
      </div>
      <nav aria-label={t("Account navigation")}>
        <Link href="/careers">{t("Careers")}</Link>
        <Link href="/applications">{t("My applications")}</Link>
        <Link href="/recruiter/sign-in">{t("Recruiter sign in")}</Link>
      </nav>
    </footer>
  );
}
