"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { WorldRecord } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Globe } from "lucide-react";

/**
 * WorldCard -- gallery card displaying a generated 3D world.
 *
 * Layout:
 * - Aspect-ratio 4:3 thumbnail area with gradient overlay.
 * - Status badge floats top-right over the thumbnail.
 * - Title + date in a compact footer.
 * - Entire card is a link to the world viewer.
 *
 * Design decisions:
 * - Uses the card token for background with subtle border.
 * - Hover lifts the card with transform + glow for depth feedback.
 * - Skeleton placeholder when no thumbnail available.
 * - Touch target exceeds 44px minimum in both dimensions.
 *
 * Accessibility:
 * - Semantic <article> with meaningful heading.
 * - Link wraps the full card for single-tap navigation.
 * - Alt text on thumbnail image.
 */

interface WorldCardProps {
  world: WorldRecord;
  className?: string;
}

export function WorldCard({ world, className }: WorldCardProps) {
  const href =
    world.status === "ready"
      ? `/world/${world.id}`
      : `/world/${world.id}`;

  return (
    <Link href={href} className="block group outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <article
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-card",
          "transition-all duration-300 ease-out",
          "group-hover:border-space-cyan/30 group-hover:shadow-[0_0_24px_-4px_var(--space-glow)]",
          "group-hover:-translate-y-0.5",
          "group-focus-visible:border-space-cyan/30",
          className
        )}
      >
        {/* Thumbnail area */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {world.thumbnail_url ? (
            <img
              src={world.thumbnail_url}
              alt={`Preview of ${world.title}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            /* Placeholder when no thumbnail is available */
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-space-surface to-space-surface-elevated">
              <Globe
                className="size-10 text-muted-foreground/40"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Gradient overlay at bottom for text readability */}
          <div
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/80 to-transparent"
            aria-hidden="true"
          />

          {/* Status badge */}
          <div className="absolute top-2.5 right-2.5">
            <StatusBadge status={world.status} />
          </div>
        </div>

        {/* Content footer */}
        <div className="p-3 space-y-1">
          <h3 className="text-sm font-semibold text-foreground truncate leading-tight">
            {world.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatRelativeDate(world.created_at)}
          </p>
        </div>
      </article>
    </Link>
  );
}

/**
 * Formats an ISO date string into a human-friendly relative format.
 * Falls back to a short absolute format for dates older than 7 days.
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
