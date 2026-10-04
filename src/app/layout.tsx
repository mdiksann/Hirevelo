import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "@/components/shared/toaster";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Hirevelo",
  description: "Applicant tracking system",
};

type Props = { children: ReactNode };

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.className} ${GeistSans.variable} bg-canvas font-sans text-ink antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
