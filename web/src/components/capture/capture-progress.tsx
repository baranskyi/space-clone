"use client";

import { cn } from "@/lib/utils";

/**
 * CaptureProgress -- circular compass rose showing 16 capture positions.
 *
 * Design rationale:
 * - 16 evenly-spaced dots arranged in a circle mimic a compass rose,
 *   reinforcing the 360-degree spatial metaphor.
 * - Completed positions fill with the primary cyan; the current active
 *   position pulses with glow to draw the eye.
 * - The inner counter ("4/16") gives precise numeric feedback.
 * - SVG-based so it scales cleanly across all densities.
 *
 * Accessibility:
 * - role="img" with aria-label describing progress state.
 * - Sufficient contrast: filled dots at ~7.8:1 against bg.
 */

interface CaptureProgressProps {
  /** How many of the 16 positions have been captured (0-16) */
  captured: number;
  /** Which position index is currently active (0-15), or null */
  activeIndex: number | null;
  /** Diameter in px. Defaults to 200. */
  size?: number;
  className?: string;
}

const TOTAL_POSITIONS = 16;

export function CaptureProgress({
  captured,
  activeIndex,
  size = 200,
  className,
}: CaptureProgressProps) {
  const center = size / 2;
  const radius = size / 2 - 20; // inset from edge for padding
  const dotRadius = size < 160 ? 5 : 7;

  return (
    <div
      role="img"
      aria-label={`Capture progress: ${captured} of ${TOTAL_POSITIONS} photos taken`}
      className={cn("relative inline-flex items-center justify-center", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Faint ring connecting the dots */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="var(--border)"
          strokeWidth="1"
          fill="none"
          opacity={0.5}
        />

        {/* 16 position dots */}
        {Array.from({ length: TOTAL_POSITIONS }).map((_, i) => {
          /* Start from top (12 o'clock) and go clockwise */
          const angle = (i * 360) / TOTAL_POSITIONS - 90;
          const rad = (angle * Math.PI) / 180;
          const x = center + radius * Math.cos(rad);
          const y = center + radius * Math.sin(rad);

          const isCaptured = i < captured;
          const isActive = i === activeIndex;

          return (
            <g key={i}>
              {/* Active position outer glow */}
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r={dotRadius + 6}
                  fill="var(--space-cyan)"
                  opacity={0.15}
                  className="animate-space-pulse"
                />
              )}

              {/* Active position ring */}
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r={dotRadius + 3}
                  stroke="var(--space-cyan)"
                  strokeWidth="1.5"
                  fill="none"
                  opacity={0.6}
                />
              )}

              {/* The dot itself */}
              <circle
                cx={x}
                cy={y}
                r={dotRadius}
                fill={
                  isCaptured
                    ? "var(--space-cyan)"
                    : isActive
                      ? "var(--space-cyan)"
                      : "var(--muted)"
                }
                opacity={isCaptured ? 1 : isActive ? 0.9 : 0.4}
                className={cn(
                  "transition-all duration-300",
                  isActive && "animate-space-pulse"
                )}
              />

              {/* Cardinal direction labels: N, E, S, W */}
              {i % 4 === 0 && (
                <text
                  x={center + (radius + 14) * Math.cos(rad)}
                  y={center + (radius + 14) * Math.sin(rad)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--muted-foreground)"
                  fontSize={size < 160 ? 8 : 10}
                  fontWeight="500"
                  fontFamily="var(--font-geist-sans)"
                >
                  {["N", "E", "S", "W"][i / 4]}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Center counter */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums text-foreground">
          {captured}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          of {TOTAL_POSITIONS}
        </span>
      </div>
    </div>
  );
}
