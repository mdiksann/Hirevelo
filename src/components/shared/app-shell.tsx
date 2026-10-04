"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Navigation } from "@/components/shared/navigation";
type Props = {
  role: "recruiter" | "candidate";
  children: ReactNode;
  recentJobs?: readonly { id: string; title: string }[];
};
export function AppShell({ role, children, recentJobs }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-dvh flex-col overflow-hidden border-border-subtle bg-surface lg:m-4 lg:h-[calc(100dvh-32px)] lg:flex-row lg:rounded-[var(--hv-radius-shell)] lg:border lg:shadow-[var(--hv-shadow-shell)]">
      <aside className="hidden w-[var(--hv-sidebar-w)] shrink-0 border-r border-border-subtle px-3 py-4 lg:block">
        <Navigation role={role} recentJobs={recentJobs} />
      </aside>
      <header className="flex h-12 shrink-0 items-center border-b border-border-subtle px-4 lg:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className="flex size-10 items-center justify-center rounded-control"
            aria-label="Open navigation"
          >
            <Menu aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </DialogTrigger>
          <DialogContent className="top-0 left-0 h-dvh w-[var(--hv-sidebar-w)] max-w-none translate-x-0 translate-y-0 rounded-none border-0 border-r border-border-subtle bg-surface p-4 shadow-[var(--hv-shadow-overlay)]">
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            <div className="mt-8">
              <Navigation
                role={role}
                recentJobs={recentJobs}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </header>
      <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
