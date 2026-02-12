"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/viewer/bottom-sheet";
import { GenerationProgress } from "@/components/viewer/generation-progress";
import { ShareActions } from "@/components/share/share-actions";
import { ArrowLeft, ExternalLink, Eye } from "lucide-react";
import type { WorldRecord } from "@/lib/types";

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

  const [world, setWorld] = useState<WorldRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [genPercent, setGenPercent] = useState<number | null>(null);
  const [genStageText, setGenStageText] = useState("Processing...");

  // Fetch world data
  const fetchWorld = useCallback(async () => {
    try {
      const res = await fetch(`/api/worlds/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setWorld(data.world);
      }
    } catch {
      // Will show not-found state
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchWorld();
  }, [fetchWorld]);

  // Poll generation status
  useEffect(() => {
    if (!world || (world.status !== "generating" && world.status !== "pending")) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate/status?worldId=${world.id}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "ready" && data.world) {
          setWorld(data.world);
        } else if (data.status === "failed") {
          setWorld((w) => w ? { ...w, status: "failed" } : w);
        } else if (data.progress) {
          const pct = data.progress.percent;
          setGenPercent(pct ?? null);
          if (pct !== null) {
            const stageIdx = Math.min(
              Math.floor((pct / 100) * GENERATION_STAGES.length),
              GENERATION_STAGES.length - 1
            );
            setGenStageText(GENERATION_STAGES[stageIdx]);
          }
        }
      } catch {
        // Retry on next interval
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [world?.id, world?.status]);

  // Loading
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

  // Generating state
  if (world.status === "generating" || world.status === "pending") {
    return (
      <div className="flex h-dvh flex-col bg-background safe-top safe-bottom">
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

        <div className="flex-1 flex flex-col items-center justify-center">
          <GenerationProgress
            percent={genPercent}
            statusText={
              world.status === "pending"
                ? "Waiting in queue..."
                : genStageText
            }
          />
          <h2 className="mt-4 text-lg font-semibold text-foreground text-center px-6">
            {world.title}
          </h2>
        </div>
      </div>
    );
  }

  // Failed state
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
          <h2 className="text-lg font-semibold text-foreground">Generation Failed</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Something went wrong. Try capturing again with better lighting.
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

  // Ready state — full-screen viewer
  return (
    <div className="relative h-dvh bg-black overflow-hidden">
      {!iframeLoaded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground">Loading 3D viewer...</span>
          </div>
        </div>
      )}

      <iframe
        src={world.viewer_url ?? "about:blank"}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; gyroscope; fullscreen"
        allowFullScreen
        onLoad={() => setIframeLoaded(true)}
        title={`3D view of ${world.title}`}
      />

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

      <div className="absolute top-3 right-4 z-30 safe-top">
        <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5">
          <Eye className="size-3 text-white/60" aria-hidden="true" />
          <span className="text-[11px] text-white/60 font-medium">Use WASD to navigate</span>
        </div>
      </div>

      <BottomSheet>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground truncate">{world.title}</h1>
              {world.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{world.description}</p>
              )}
            </div>
          </div>

          <ShareActions worldId={world.id} title={world.title} />

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
