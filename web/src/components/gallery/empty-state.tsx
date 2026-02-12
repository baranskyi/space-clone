import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EmptyState -- shown when the user has no worlds yet.
 *
 * Design rationale:
 * - Centered layout with generous whitespace so it doesn't feel "broken."
 * - A subtle animated ring provides visual interest without being distracting.
 * - Clear CTA button with the primary cyan accent.
 * - The icon uses muted color to avoid competing with the button.
 */

interface EmptyStateProps {
  className?: string;
}

export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-16 gap-6",
        className
      )}
    >
      {/* Animated icon container */}
      <div className="relative">
        {/* Outer orbiting ring */}
        <div
          className="absolute inset-0 rounded-full border border-space-cyan/20 animate-space-spin-slow"
          style={{ width: 96, height: 96, top: -8, left: -8 }}
          aria-hidden="true"
        />
        <div className="flex size-20 items-center justify-center rounded-full bg-space-surface border border-border">
          <Camera className="size-8 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      {/* Text */}
      <div className="space-y-2 max-w-xs">
        <h2 className="text-lg font-semibold text-foreground">
          No spaces yet
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Capture 16 photos around you and we will stitch them into an
          immersive 3D world you can explore and share.
        </p>
      </div>

      {/* CTA */}
      <Button asChild size="lg" className="gap-2 touch-target">
        <Link href="/capture">
          <Camera className="size-4" aria-hidden="true" />
          Start Capture
        </Link>
      </Button>
    </div>
  );
}
