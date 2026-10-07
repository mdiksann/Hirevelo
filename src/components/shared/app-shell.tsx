"use client";
import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Navigation } from "@/components/shared/navigation";
import { Brand } from "@/components/shared/brand";
import {
  LanguageSwitcher,
  useTranslator,
} from "@/components/i18n/language-provider";
export function AppShell({
  role,
  children,
  recentJobs,
}: {
  role: "recruiter" | "candidate";
  children: ReactNode;
  recentJobs?: readonly { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslator();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("Skip to content")}
      </a>
      <aside className="desktop-sidebar">
        <Navigation role={role} recentJobs={recentJobs} />
      </aside>
      <header className="mobile-app-header">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className="mobile-menu-trigger"
            aria-label={t("Open navigation")}
          >
            <Menu aria-hidden="true" size={22} />
          </DialogTrigger>
          <DialogContent
            className="app-drawer top-0 left-0 translate-x-0 translate-y-0"
            aria-describedby="drawer-description"
          >
            <DialogTitle className="sr-only">{t("Navigation")}</DialogTitle>
            <DialogDescription id="drawer-description" className="sr-only">
              {t(
                role === "recruiter"
                  ? "Recruiter workspace"
                  : "Candidate workspace",
              )}
            </DialogDescription>
            <Navigation
              role={role}
              recentJobs={recentJobs}
              onNavigate={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
        <Brand />
        <LanguageSwitcher />
      </header>
      <div className="workspace-column">
        <div className="workspace-topbar">
          <span>
            {t(
              role === "recruiter"
                ? "Recruiter workspace"
                : "Candidate workspace",
            )}
          </span>
          <span className="workspace-topbar-detail">
            {t("Clear steps. Connected people.")}
          </span>
        </div>
        <main id="main-content" tabIndex={-1} className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
