import { cn } from "@/lib/utils";
import type { WorldRecord } from "@/lib/types";

/**
 * StatusBadge -- color-coded pill indicating world generation state.
 *
 * Semantic color mapping:
 * - pending:     muted grey -- neutral, waiting
 * - generating:  amber pulse -- active processing, draws attention
 * - ready:       green -- success, safe to interact
 * - failed:      red -- error state
 *
 * Accessibility:
 * - Uses aria-label for screen readers.
 * - Text labels always visible (no icon-only badges).
 * - Minimum 44px tap target when interactive.
 */

type WorldStatus = WorldRecord["status"];

const statusConfig: Record<
  WorldStatus,
  { label: string; dotClass: string; bgClass: string; textClass: string }
> = {
  pending: {
    label: "Pending",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted/50",
    textClass: "text-muted-foreground",
  },
  generating: {
    label: "Generating",
    dotClass: "bg-space-warning animate-space-pulse",
    bgClass: "bg-space-warning/10",
    textClass: "text-space-warning",
  },
  ready: {
    label: "Ready",
    dotClass: "bg-space-success",
    bgClass: "bg-space-success/10",
    textClass: "text-space-success",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-destructive",
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
  },
};

interface StatusBadgeProps {
  status: WorldStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full shrink-0", config.dotClass)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
