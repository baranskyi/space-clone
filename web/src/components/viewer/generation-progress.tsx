"use client";

import { cn } from "@/lib/utils";

/**
 * GenerationProgress -- loading indicator for world generation (~5 min).
 *
 * Design:
 * - Full-screen overlay with a centered orbital animation.
 * - Percentage text when available, otherwise an indeterminate spinner.
 * - Status text below for user confidence ("Generating 3D mesh...").
 * - Dark overlay preserves the spatial feel.
 *
 * The orbital animation uses two concentric rings rotating at different
 * speeds to create a sci-fi "processing" feel without being heavy on GPU.
 */

interface GenerationProgressProps {
  /** 0-100 percent, or null for indeterminate */
  percent: number | null;
  /** Human-readable status like "Generating 3D mesh..." */
  statusText: string;
  className?: string;
}

export function GenerationProgress({
  percent,
  statusText,
  className,
}: GenerationProgressProps) {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeOffset =
    percent !== null
      ? circumference - (percent / 100) * circumference
      : circumference * 0.75; // indeterminate shows 25%

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 p-8",
        className
      )}
      role="progressbar"
      aria-valuenow={percent ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={statusText}
    >
      {/* Orbital progress ring */}
      <div className="relative size-32">
        {/* Background ring */}
        <svg
          className="absolute inset-0 size-full -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="var(--muted)"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="url(#progressGradient)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className={cn(
              "transition-[stroke-dashoffset] duration-1000 ease-out",
              percent === null && "animate-space-spin-slow origin-center"
            )}
            style={
              percent === null
                ? { transformOrigin: "50px 50px" }
                : undefined
            }
          />
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="var(--space-cyan)" />
              <stop offset="100%" stopColor="var(--space-purple)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Orbiting dot */}
        <div
          className="absolute inset-0 animate-space-spin-slow"
          aria-hidden="true"
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-space-cyan"
            style={{ boxShadow: "0 0 8px 2px var(--space-glow)" }}
          />
        </div>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {percent !== null ? (
            <>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {Math.round(percent)}%
              </span>
            </>
          ) : (
            <div className="size-2 rounded-full bg-space-cyan animate-space-pulse" />
          )}
        </div>
      </div>

      {/* Status text */}
      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-foreground">{statusText}</p>
        <p className="text-xs text-muted-foreground">
          This typically takes 3-5 minutes
        </p>
      </div>
    </div>
  );
}
