import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Camera, Globe, ChevronRight, Sparkles } from "lucide-react";

/**
 * Landing / Home Page
 * ===================
 * The first screen users see. Designed to communicate the core value
 * proposition in under 3 seconds and funnel users to capture.
 *
 * Layout (mobile-first, centered):
 * 1. Animated orbital illustration (spatial feel)
 * 2. App name with gradient text
 * 3. Tagline (one sentence)
 * 4. Primary CTA: Start Capture
 * 5. Secondary CTA: My Worlds
 * 6. Subtle feature hints at bottom
 *
 * Design decisions:
 * - Dark background with no cards or containers -- just content floating
 *   in space, reinforcing the app's spatial identity.
 * - The orbital animation (CSS only, no JS) creates visual interest
 *   without blocking interactivity or hurting performance.
 * - Staggered fade-in animations guide the eye top-to-bottom.
 * - All touch targets exceed 44px minimum.
 */

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-10 p-6 text-center overflow-hidden safe-top safe-bottom">
      {/* ============================================================
          Background ambient glow
          ============================================================ */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Top-right cyan glow */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle, var(--space-cyan), transparent 70%)",
          }}
        />
        {/* Bottom-left purple glow */}
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle, var(--space-purple), transparent 70%)",
          }}
        />
      </div>

      {/* ============================================================
          Orbital illustration
          ============================================================ */}
      <div
        className="relative size-28 animate-space-fade-in"
        style={{ animationDelay: "0ms" }}
      >
        {/* Outer orbit ring */}
        <div className="absolute inset-0 rounded-full border border-border/50 animate-space-spin-slow" />

        {/* Orbiting dot */}
        <div
          className="absolute inset-0 animate-space-spin-slow"
          style={{ animationDuration: "6s" }}
        >
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 size-2 rounded-full bg-space-cyan"
            style={{ boxShadow: "0 0 8px 2px var(--space-glow)" }}
          />
        </div>

        {/* Inner orbit ring */}
        <div
          className="absolute inset-4 rounded-full border border-border/30 animate-space-spin-slow"
          style={{ animationDirection: "reverse", animationDuration: "12s" }}
        />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-space-surface border border-border">
            <Globe className="size-7 text-primary" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* ============================================================
          Text content
          ============================================================ */}
      <div
        className="space-y-3 animate-space-fade-in"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-gradient-space">Space Clone</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xs mx-auto leading-relaxed">
          Clone any space into a navigable 3D world in minutes
        </p>
      </div>

      {/* ============================================================
          CTAs
          ============================================================ */}
      <div
        className="flex flex-col gap-3 w-full max-w-xs animate-space-fade-in"
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      >
        <Button asChild size="lg" className="w-full gap-2 touch-target">
          <Link href="/capture">
            <Camera className="size-4" aria-hidden="true" />
            Start Capture
            <ChevronRight className="size-4 ml-auto opacity-50" aria-hidden="true" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full gap-2 touch-target"
        >
          <Link href="/gallery">
            <Sparkles className="size-4" aria-hidden="true" />
            My Worlds
          </Link>
        </Button>
      </div>

      {/* ============================================================
          Feature hints
          ============================================================ */}
      <div
        className="flex gap-6 text-xs text-muted-foreground animate-space-fade-in"
        style={{ animationDelay: "400ms", animationFillMode: "both" }}
        aria-label="Key features"
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-foreground font-semibold text-sm tabular-nums">16</span>
          <span>Photos</span>
        </div>
        <div className="h-8 w-px bg-border" aria-hidden="true" />
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-foreground font-semibold text-sm">360</span>
          <span>Panorama</span>
        </div>
        <div className="h-8 w-px bg-border" aria-hidden="true" />
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-foreground font-semibold text-sm">3D</span>
          <span>World</span>
        </div>
      </div>
    </main>
  );
}
