"use client";
import {
  createContext,
  useContext,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Languages, LoaderCircle } from "lucide-react";
import { createTranslator, localeCookie, type Locale } from "@/lib/i18n";
const LanguageContext = createContext<Locale>("en");
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={locale}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLocale() {
  return useContext(LanguageContext);
}
export function useTranslator() {
  return createTranslator(useLocale());
}
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslator();
  return (
    <label className="language-switcher">
      {pending ? (
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
      ) : (
        <Languages aria-hidden="true" size={16} />
      )}
      <span className="sr-only">{t("Language")}</span>
      <select
        value={locale}
        disabled={pending}
        aria-busy={pending}
        onChange={(event) => {
          document.cookie = `${localeCookie}=${event.target.value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
          startTransition(() => router.refresh());
        }}
      >
        <option value="id">ID</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
