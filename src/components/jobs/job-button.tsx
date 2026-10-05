import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
const variants = {
  default: "hover:bg-primary-hover",
  outline: "shadow-none hover:bg-surface-subtle hover:text-ink-body",
  ghost: "hover:bg-[var(--hv-surface-active)]",
  destructive: "hover:bg-[var(--hv-danger-solid)]",
};
export function JobButton({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      variant={variant}
      className={cn(
        "rounded-control text-[length:var(--hv-text-ui)] max-sm:min-h-10",
        variants[variant as keyof typeof variants],
        className,
      )}
    />
  );
}
