"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CaptureProgress } from "@/components/capture/capture-progress";
import { useCamera } from "@/hooks/use-camera";
import {
  useDeviceOrientation,
  isAlignedWithSlot,
} from "@/hooks/use-device-orientation";
import { X, ChevronRight, RotateCcw, Camera, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL_POSITIONS = 16;

const DIRECTION_LABELS = [
  "Front",
  "Front-Right",
  "Right-Front",
  "Right",
  "Right-Back",
  "Back-Right",
  "Back",
  "Back-Left",
  "Left-Back",
  "Left",
  "Left-Front",
  "Front-Left",
  "Front",
  "Front-Right",
  "Right-Front",
  "Right",
];

export default function CapturePage() {
  const router = useRouter();
  const [captured, setCaptured] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const startHeadingRef = useRef<number | null>(null);

  const { videoRef, canvasRef, isReady, error: cameraError, capture: captureFrame } = useCamera();
  const { heading, isTracking, permissionNeeded, requestPermission } = useDeviceOrientation();

  const currentIndex = captured.length;
  const isComplete = currentIndex >= TOTAL_POSITIONS;

  // Record starting heading on first capture
  const ensureStartHeading = useCallback(() => {
    if (startHeadingRef.current === null && heading !== null) {
      startHeadingRef.current = heading;
    }
  }, [heading]);

  // Check if user is aligned with current slot (for visual feedback)
  const isAligned =
    isTracking &&
    heading !== null &&
    startHeadingRef.current !== null &&
    !isComplete &&
    isAlignedWithSlot(heading, startHeadingRef.current, currentIndex);

  const handleCapture = useCallback(() => {
    if (isComplete || isCapturing) return;

    ensureStartHeading();
    setIsCapturing(true);

    // Flash effect
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    const dataUrl = captureFrame();
    if (dataUrl) {
      setCaptured((prev) => [...prev, dataUrl]);
    }

    setIsCapturing(false);
  }, [isComplete, isCapturing, captureFrame, ensureStartHeading]);

  const handleReset = useCallback(() => {
    setCaptured([]);
    startHeadingRef.current = null;
  }, []);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleDone = useCallback(async () => {
    setIsUploading(true);

    try {
      // 1. Convert data URLs to files and upload
      setUploadStatus("Uploading photos...");
      const formData = new FormData();
      for (let i = 0; i < captured.length; i++) {
        const res = await fetch(captured[i]);
        const blob = await res.blob();
        formData.append("photos", blob, `photo_${String(i).padStart(2, "0")}.jpg`);
      }

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { sessionId } = await uploadRes.json();

      // 2. Trigger stitching
      setUploadStatus("Stitching panorama...");
      const stitchRes = await fetch("/api/stitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!stitchRes.ok) throw new Error("Stitching failed");

      // 3. Trigger 3D generation
      setUploadStatus("Starting 3D generation...");
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, title: "New Space" }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const { worldId } = await genRes.json();

      // Navigate to world viewer (will show generation progress)
      router.push(`/world/${worldId}`);
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : "Something went wrong");
      setIsUploading(false);
    }
  }, [router, captured]);

  // Auto-scroll thumbnail strip to end
  const thumbStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (thumbStripRef.current) {
      thumbStripRef.current.scrollLeft = thumbStripRef.current.scrollWidth;
    }
  }, [captured.length]);

  // Camera error state
  if (cameraError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-black p-6 text-center safe-top safe-bottom">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/20 border border-destructive/30">
          <AlertCircle className="size-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Camera Access Required</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{cameraError}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh flex-col bg-black safe-top safe-bottom overflow-hidden">
      {/* Flash overlay */}
      {flashVisible && (
        <div className="absolute inset-0 z-50 bg-white/30 pointer-events-none animate-space-fade-in" />
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ============================================================
          Top bar
          ============================================================ */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-3 safe-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="touch-target rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
          aria-label="Cancel capture"
        >
          <X className="size-5" />
        </Button>

        <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-sm px-3.5 py-1.5">
          <span className="text-sm font-semibold tabular-nums text-white">
            {currentIndex}/{TOTAL_POSITIONS}
          </span>
        </div>

        {captured.length > 0 && !isComplete ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="touch-target rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
            aria-label="Reset all captures"
          >
            <RotateCcw className="size-4" />
          </Button>
        ) : (
          <div className="size-10" /> // Spacer
        )}
      </header>

      {/* ============================================================
          Camera viewfinder (live video)
          ============================================================ */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 size-full object-cover"
        />

        {/* Loading state */}
        {!isReady && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <Camera className="size-10 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">Starting camera...</p>
          </div>
        )}

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(var(--space-cyan) 1px, transparent 1px), linear-gradient(90deg, var(--space-cyan) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="relative size-16">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/20" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
            <div className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full transition-colors duration-200",
              isAligned ? "bg-space-cyan" : "bg-white/40"
            )} />
          </div>
        </div>

        {/* Alignment ring — glows when user is pointed at correct direction */}
        {isTracking && !isComplete && (
          <div
            className={cn(
              "absolute inset-0 pointer-events-none transition-opacity duration-300 border-2 rounded-none",
              isAligned ? "opacity-100 border-space-cyan/40" : "opacity-0 border-transparent"
            )}
            aria-hidden="true"
          />
        )}

        {/* Compass progress */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 safe-top">
          <CaptureProgress
            captured={currentIndex}
            activeIndex={isComplete ? null : currentIndex}
            size={140}
          />
        </div>

        {/* Gyroscope heading debug (hidden in production, useful for testing) */}
        {isTracking && heading !== null && (
          <div className="absolute top-4 right-4 z-20 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1">
            <span className="text-[10px] font-mono text-white/50 tabular-nums">
              {heading}°
            </span>
          </div>
        )}

        {/* iOS permission prompt */}
        {permissionNeeded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
            <div className="text-center space-y-4 px-8">
              <p className="text-sm text-white/80">
                Enable gyroscope for guided capture?
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" size="sm" onClick={() => {/* skip */}}>
                  Skip
                </Button>
                <Button size="sm" onClick={requestPermission}>
                  Enable
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Direction guidance */}
        {!isComplete && isReady && (
          <div className="absolute bottom-32 inset-x-0 flex flex-col items-center gap-1 animate-space-fade-in">
            <div className="flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-sm px-4 py-2">
              <span className="text-xs font-medium text-white/80">
                Point camera
              </span>
              <ChevronRight className="size-3.5 text-space-cyan" aria-hidden="true" />
              <span className={cn(
                "text-xs font-semibold transition-colors duration-200",
                isAligned ? "text-space-success" : "text-space-cyan"
              )}>
                {DIRECTION_LABELS[currentIndex] ?? "Complete"}
              </span>
            </div>
          </div>
        )}

        {/* Completion overlay */}
        {isComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-space-fade-in z-20">
            <div className="space-y-4 text-center px-6">
              <div className="inline-flex size-16 items-center justify-center rounded-full bg-space-success/20 border border-space-success/30">
                <svg
                  className="size-8 text-space-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">All 16 captured!</h2>
              <p className="text-sm text-white/60">
                {isUploading ? uploadStatus : "Ready to generate your 3D world"}
              </p>
              <Button
                size="lg"
                onClick={handleDone}
                disabled={isUploading}
                className="mt-2 gap-2 touch-target"
              >
                {isUploading ? (
                  <>
                    <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Generate World
                    <ChevronRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          Bottom controls: thumbnail strip + capture button
          ============================================================ */}
      <div className="relative z-30 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-4 px-4 safe-bottom">
        {/* Thumbnail strip */}
        {captured.length > 0 && (
          <div
            ref={thumbStripRef}
            className="mb-4 flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1"
            role="list"
            aria-label="Captured photos"
          >
            {captured.map((src, i) => (
              <div
                key={i}
                role="listitem"
                className={cn(
                  "shrink-0 size-14 rounded-lg overflow-hidden border-2 transition-all duration-200",
                  "animate-space-scale-in",
                  i === captured.length - 1
                    ? "border-space-cyan glow-ring"
                    : "border-white/10"
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Capture button row */}
        {!isComplete && (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing || !isReady}
              className={cn(
                "relative size-[72px] rounded-full",
                "border-[3px] border-white/80",
                "transition-all duration-150 active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-space-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                "disabled:opacity-50 disabled:active:scale-100"
              )}
              aria-label={`Capture photo ${currentIndex + 1} of ${TOTAL_POSITIONS}`}
            >
              {/* Inner filled circle */}
              <div
                className={cn(
                  "absolute inset-[4px] rounded-full bg-white transition-all duration-150",
                  isCapturing && "scale-90 bg-white/70"
                )}
              />

              {/* Glow when aligned */}
              {!isCapturing && (
                <div
                  className={cn(
                    "absolute -inset-1 rounded-full border transition-all duration-300",
                    isAligned
                      ? "border-space-cyan/60 animate-space-glow"
                      : "border-space-cyan/30 animate-space-pulse"
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
