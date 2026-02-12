"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/viewer/bottom-sheet";
import { GenerationProgress } from "@/components/viewer/generation-progress";
import { ShareActions } from "@/components/share/share-actions";
import { ArrowLeft, ExternalLink, Eye } from "lucide-react";
import type { WorldRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * World Viewer Screen
 * ===================
 * Full-screen immersive viewer for a generated 3D world.
 *
 * States:
 * 1. Loading -- fetching world data from Supabase
 * 2. Generating -- world is being processed by World Labs (~3-5 min)
 *    Shows GenerationProgress with percentage and status text
 * 3. Ready -- world is viewable, shows iframe + bottom sheet
 * 4. Failed -- generation failed, shows error + retry option
 *
 * Layout:
 * - Full viewport iframe (no chrome) when ready
 * - Back button floats top-left with glassmorphism
 * - BottomSheet peeks from bottom with title, actions, share
 * - Entire screen is edge-to-edge for maximum immersion
 *
 * The iframe points to marble.worldlabs.ai which provides
 * its own navigation controls (WASD, mouse look, etc.)
 */

/* ==========================================================================
   Mock data -- replace with Supabase fetch by world ID
   ========================================================================== */
const MOCK_WORLDS: Record<string, WorldRecord> = {
  "w-1": {
    id: "w-1",
    user_id: "u-1",
    session_id: "s-1",
    world_labs_id: "wl-1",
    operation_id: null,
    status: "ready",
    title: "Living Room",
    description: "My apartment living room captured on a sunny afternoon. A cozy space with natural light streaming through large windows.",
    viewer_url: "https://marble.worldlabs.ai/viewer/abc123",
    thumbnail_url: null,
    panorama_url: null,
    splat_url: null,
    mesh_url: null,
    is_public: true,
    share_slug: "living-room-abc",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  "w-2": {
    id: "w-2",
    user_id: "u-1",
    session_id: "s-2",
    world_labs_id: null,
    operation_id: "op-2",
    status: "generating",
    title: "Office Space",
    description: "Coworking space downtown with open plan layout.",
    viewer_url: null,
    thumbnail_url: null,
    panorama_url: null,
    splat_url: null,
    mesh_url: null,
    is_public: false,
    share_slug: null,
    created_at: new Date(Date.now() - 300000).toISOString(),
    updated_at: new Date(Date.now() - 60000).toISOString(),
  },
};

/** Simulated generation status messages */
const GENERATION_STAGES = [
  "Uploading panorama...",
  "Analyzing scene geometry...",
  "Generating depth map...",
  "Building 3D point cloud...",
  "Creating Gaussian splats...",
  "Generating mesh...",
  "Optimizing textures...",
  "Finalizing world...",
];

export default function WorldViewerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  /* World data state */
  const [world, setWorld] = useState<WorldRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  /* Generation progress simulation */
  const [genPercent, setGenPercent] = useState<number>(0);
  const [genStage, setGenStage] = useState(0);

  /* Fetch world data */
  useEffect(() => {
    /* In production: fetch from Supabase by params.id */
    const mockWorld = MOCK_WORLDS[params.id] ?? {
      id: params.id,
      user_id: "u-1",
      session_id: null,
      world_labs_id: "wl-demo",
      operation_id: null,
      status: "ready" as const,
      title: `World ${params.id}`,
      description: "A generated 3D space",
      viewer_url: "https://marble.worldlabs.ai/viewer/demo",
      thumbnail_url: null,
      panorama_url: null,
      splat_url: null,
      mesh_url: null,
      is_public: true,
      share_slug: `world-${params.id}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTimeout(() => {
      setWorld(mockWorld);
      setLoading(false);
    }, 500);
  }, [params.id]);

  /* Simulate generation progress when status is "generating" */
  useEffect(() => {
    if (!world || world.status !== "generating") return;

    const interval = setInterval(() => {
      setGenPercent((prev) => {
        const next = prev + Math.random() * 3 + 0.5;
        if (next >= 100) {
          clearInterval(interval);
          /* In production: poll getOperation API instead */
          setWorld((w) =>
            w ? { ...w, status: "ready", viewer_url: "https://marble.worldlabs.ai/viewer/demo" } : w
          );
          return 100;
        }
        return next;
      });

      setGenStage((prev) => {
        const nextStage = Math.min(
          Math.floor((genPercent / 100) * GENERATION_STAGES.length),
          GENERATION_STAGES.length - 1
        );
        return nextStage;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [world?.status, genPercent]);

  /* Loading state */
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Loading world...</span>
        </div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-muted-foreground">World not found</p>
        <Button variant="outline" onClick={() => router.push("/gallery")}>
          Back to Gallery
        </Button>
      </div>
    );
  }

  /* Generating state */
  if (world.status === "generating" || world.status === "pending") {
    return (
      <div className="flex h-dvh flex-col bg-background safe-top safe-bottom">
        {/* Back button */}
        <header className="flex items-center px-4 pt-3 safe-top">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/gallery")}
            className="gap-2 touch-target"
          >
            <ArrowLeft className="size-4" />
            Gallery
          </Button>
        </header>

        {/* Centered progress */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <GenerationProgress
            percent={world.status === "generating" ? genPercent : null}
            statusText={
              world.status === "pending"
                ? "Waiting in queue..."
                : GENERATION_STAGES[genStage] ?? "Processing..."
            }
          />
          <h2 className="mt-4 text-lg font-semibold text-foreground text-center px-6">
            {world.title}
          </h2>
        </div>
      </div>
    );
  }

  /* Failed state */
  if (world.status === "failed") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-background p-6 safe-top safe-bottom">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
          <svg
            className="size-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Generation Failed
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {world.description ?? "Something went wrong while generating this world. Try capturing again with better lighting."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/gallery")}>
            Back to Gallery
          </Button>
          <Button onClick={() => router.push("/capture")}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  /* Ready state -- full-screen viewer */
  return (
    <div className="relative h-dvh bg-black overflow-hidden">
      {/* Iframe loading overlay */}
      {!iframeLoaded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground">Loading 3D viewer...</span>
          </div>
        </div>
      )}

      {/* 3D World iframe -- full viewport */}
      <iframe
        src={world.viewer_url ?? "about:blank"}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; gyroscope; fullscreen"
        allowFullScreen
        onLoad={() => setIframeLoaded(true)}
        title={`3D view of ${world.title}`}
      />

      {/* Back button -- floats over iframe */}
      <div className="absolute top-3 left-4 z-30 safe-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/gallery")}
          className="touch-target rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
          aria-label="Back to gallery"
        >
          <ArrowLeft className="size-5" />
        </Button>
      </div>

      {/* Fullscreen hint -- top right */}
      <div className="absolute top-3 right-4 z-30 safe-top">
        <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5">
          <Eye className="size-3 text-white/60" aria-hidden="true" />
          <span className="text-[11px] text-white/60 font-medium">
            Use WASD to navigate
          </span>
        </div>
      </div>

      {/* Bottom sheet with world info + actions */}
      <BottomSheet>
        <div className="space-y-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground truncate">
                {world.title}
              </h1>
              {world.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {world.description}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <ShareActions worldId={world.id} title={world.title} />

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
            <span>
              Created{" "}
              {new Date(world.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {world.is_public && (
              <span className="flex items-center gap-1">
                <ExternalLink className="size-3" aria-hidden="true" />
                Public
              </span>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
