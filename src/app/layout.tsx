import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "@/components/shared/toaster";

import "@/styles/globals.css";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { env } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    metadataBase: new URL(env.AUTH_URL),
    title: "Hirevelo",
    description: t("A simple, connected space for recruiters and candidates."),
  };
}

type Props = { children: ReactNode };

export default async function RootLayout({ children }: Props) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body
        className={`${GeistSans.className} ${GeistSans.variable} bg-canvas font-sans text-ink antialiased`}
      >
        <LanguageProvider locale={locale}>
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
