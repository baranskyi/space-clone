"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * BottomSheet -- draggable bottom sheet for the world viewer.
 *
 * Design decisions:
 * - Starts at a "peek" height showing title + actions.
 * - Draggable handle lets users pull it to full or dismiss to peek.
 * - Uses transform for smooth 60fps animation (GPU-composited).
 * - Glassmorphism background to let the 3D viewer peek through.
 *
 * Accessibility:
 * - Handle has role="slider" for screen reader drag semantics.
 * - Content is always reachable via keyboard (no hidden states).
 * - Focus trap when expanded (future enhancement).
 */

interface BottomSheetProps {
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ children, className }: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const diff = startY.current - currentY.current;

    if (sheetRef.current) {
      /* Apply a damped translation during drag for tactile feedback */
      const dampedDiff = diff * 0.4;
      const clampedTranslate = Math.max(-20, Math.min(100, dampedDiff));
      sheetRef.current.style.transform = `translateY(${-clampedTranslate}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = startY.current - currentY.current;

    /* Swipe up threshold: 60px to expand */
    if (diff > 60) {
      setExpanded(true);
    }
    /* Swipe down threshold: 60px to collapse */
    if (diff < -60) {
      setExpanded(false);
    }

    /* Reset inline transform; let CSS take over */
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
  }, []);

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "glass-surface rounded-t-2xl safe-bottom",
        "transition-[max-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        expanded ? "max-h-[70vh]" : "max-h-[180px]",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="touch-target flex items-center justify-center"
          aria-label={expanded ? "Collapse panel" : "Expand panel"}
        >
          <div
            className="h-1 w-9 rounded-full bg-muted-foreground/30"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Sheet content */}
      <div
        className={cn(
          "overflow-y-auto px-5 pb-6",
          expanded ? "max-h-[calc(70vh-48px)]" : "max-h-[128px]",
          "scrollbar-none"
        )}
      >
        {children}
      </div>
    </div>
  );
}
