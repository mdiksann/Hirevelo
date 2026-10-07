"use client";
import { Toaster as PrimitiveToaster } from "@/components/ui/sonner";
export function Toaster() {
  return (
    <PrimitiveToaster
      theme="light"
      position="bottom-right"
      visibleToasts={3}
      expand
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            "!w-80 !rounded-[var(--hv-radius-menu)] !border-border !bg-surface !p-3 !text-[length:var(--hv-text-ui)] !text-ink-body !shadow-[var(--hv-shadow-overlay)]",
          success: "[&_svg]:text-[var(--hv-success-ink)]",
          error: "[&_svg]:text-[var(--hv-danger-ink)]",
          info: "[&_svg]:text-accent-ink",
        },
      }}
    />
  );
}
