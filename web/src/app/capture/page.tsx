"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SphereGuide } from "@/components/capture/sphere-guide";
import { useCamera } from "@/hooks/use-camera";
import { useDeviceOrientation } from "@/hooks/use-device-orientation";
import { X, ChevronRight, RotateCcw, Camera, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAPTURE_POSITIONS,
  TOTAL_POSITIONS,
  RING_INFO,
  isAlignedWithPosition,
  getNextUncaptured,
  getDirectionLabel,
  getPitchGuidance,
  getRingProgress,
  getAdjacentPositions,
  type AlignmentResult,
} from "@/lib/capture-positions";

export default function CapturePage() {
  const router = useRouter();
  // Map: position index → data URL
  const [capturedMap, setCapturedMap] = useState<Map<number, string>>(new Map());
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const startHeadingRef = useRef<number | null>(null);

  const { videoRef, canvasRef, isReady, error: cameraError, capture: captureFrame } = useCamera();
  const { heading, pitch, isTracking, permissionNeeded, requestPermission } = useDeviceOrientation();

  const capturedSet = useMemo(() => new Set(capturedMap.keys()), [capturedMap]);
  const capturedCount = capturedSet.size;
  const isComplete = capturedCount >= TOTAL_POSITIONS;

  // Smart ordering: suggest next position based on proximity
  const activeIndex = useMemo(() => {
    if (isComplete) return null;
    return getNextUncaptured(
      capturedSet,
      heading ?? 0,
      pitch ?? 0,
      startHeadingRef.current ?? 0,
    );
  }, [capturedSet, heading, pitch, isComplete]);

  // Alignment check
  const alignment: AlignmentResult = useMemo(() => {
    if (activeIndex === null || heading === null || pitch === null || startHeadingRef.current === null) {
      return { aligned: false, headingAligned: false, pitchAligned: false, headingDelta: 999, pitchDelta: 999 };
    }
    return isAlignedWithPosition(heading, pitch, activeIndex, startHeadingRef.current);
  }, [heading, pitch, activeIndex]);

  const activePos = activeIndex !== null ? CAPTURE_POSITIONS[activeIndex] : null;

  // Ring progress for active position
  const ringProgress = useMemo(() => getRingProgress(capturedSet), [capturedSet]);

  // Record starting heading on first capture
  const ensureStartHeading = useCallback(() => {
    if (startHeadingRef.current === null && heading !== null) {
      startHeadingRef.current = heading;
    }
  }, [heading]);

  const handleCapture = useCallback(() => {
    if (isComplete || isCapturing || activeIndex === null) return;

    ensureStartHeading();
    setIsCapturing(true);

    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    const dataUrl = captureFrame();
    if (dataUrl) {
      setCapturedMap((prev) => {
        const next = new Map(prev);
        next.set(activeIndex, dataUrl);
        return next;
      });
    }

    setIsCapturing(false);
  }, [isComplete, isCapturing, captureFrame, ensureStartHeading, activeIndex]);

  const handleReset = useCallback(() => {
    setCapturedMap(new Map());
    startHeadingRef.current = null;
  }, []);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleDone = useCallback(async () => {
    setIsUploading(true);
    try {
      setUploadStatus("Uploading photos...");
      const formData = new FormData();

      // Upload in position order for stitcher
      const sortedEntries = [...capturedMap.entries()].sort((a, b) => a[0] - b[0]);
      for (const [posIdx, dataUrl] of sortedEntries) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        formData.append("photos", blob, `photo_${String(posIdx).padStart(2, "0")}.jpg`);
      }

      // Add position metadata for stitcher
      const positionMeta = sortedEntries.map(([posIdx]) => {
        const pos = CAPTURE_POSITIONS[posIdx];
        return {
          index: posIdx,
          heading: ((startHeadingRef.current ?? 0) + pos.heading) % 360,
          pitch: pos.pitch,
          ring: pos.ring,
        };
      });
      formData.append("positions", JSON.stringify(positionMeta));

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { sessionId } = await uploadRes.json();

      setUploadStatus("Stitching panorama...");
      const stitchRes = await fetch("/api/stitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!stitchRes.ok) throw new Error("Stitching failed");

      setUploadStatus("Starting 3D generation...");
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, title: "New Space" }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const { worldId } = await genRes.json();

      router.push(`/world/${worldId}`);
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : "Something went wrong");
      setIsUploading(false);
    }
  }, [router, capturedMap]);

  // Auto-scroll thumbnail strip
  const thumbStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (thumbStripRef.current) {
      thumbStripRef.current.scrollLeft = thumbStripRef.current.scrollWidth;
    }
  }, [capturedCount]);

  // Overlap preview: check if any adjacent captured position is nearby
  const overlapEdge = useMemo(() => {
    if (activeIndex === null || heading === null || pitch === null || startHeadingRef.current === null) return null;
    const neighbors = getAdjacentPositions(activeIndex);
    for (const nIdx of neighbors) {
      if (!capturedSet.has(nIdx)) continue;
      const nPos = CAPTURE_POSITIONS[nIdx];
      const aPos = CAPTURE_POSITIONS[activeIndex];
      // Determine edge direction
      const nTargetH = (startHeadingRef.current + nPos.heading) % 360;
      const aTargetH = (startHeadingRef.current + aPos.heading) % 360;
      let hDiff = nTargetH - aTargetH;
      if (hDiff > 180) hDiff -= 360;
      if (hDiff < -180) hDiff += 360;
      const pDiff = nPos.pitch - aPos.pitch;

      if (Math.abs(hDiff) > Math.abs(pDiff)) {
        return { edge: hDiff > 0 ? "right" as const : "left" as const, dataUrl: capturedMap.get(nIdx)! };
      } else {
        return { edge: pDiff > 0 ? "top" as const : "bottom" as const, dataUrl: capturedMap.get(nIdx)! };
      }
    }
    return null;
  }, [activeIndex, heading, pitch, capturedSet, capturedMap]);

  // Camera error
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
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
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

      {/* ─── Top bar ───────────────────────────────────────────── */}
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
            {capturedCount}/{TOTAL_POSITIONS}
          </span>
        </div>

        {capturedCount > 0 && !isComplete ? (
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
          <div className="size-10" />
        )}
      </header>

      {/* ─── Camera viewfinder ─────────────────────────────────── */}
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

        {/* Center crosshair — cyan only when BOTH heading and pitch aligned */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="relative size-16">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/20" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
            <div className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full transition-colors duration-200",
              alignment.aligned ? "bg-space-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)]" : "bg-white/40"
            )} />
          </div>
        </div>

        {/* Alignment ring */}
        {isTracking && !isComplete && (
          <div
            className={cn(
              "absolute inset-0 pointer-events-none transition-opacity duration-300 border-2 rounded-none",
              alignment.aligned ? "opacity-100 border-space-cyan/40" : "opacity-0 border-transparent"
            )}
            aria-hidden="true"
          />
        )}

        {/* ─── Overlap preview strip ─────────────────────────── */}
        {overlapEdge && (
          <div
            className={cn(
              "absolute pointer-events-none z-10",
              overlapEdge.edge === "left" && "left-0 top-0 bottom-0 w-[20%]",
              overlapEdge.edge === "right" && "right-0 top-0 bottom-0 w-[20%]",
              overlapEdge.edge === "top" && "top-0 left-0 right-0 h-[20%]",
              overlapEdge.edge === "bottom" && "bottom-0 left-0 right-0 h-[20%]",
            )}
            aria-hidden="true"
          >
            <img
              src={overlapEdge.dataUrl}
              alt=""
              className="size-full object-cover opacity-30"
              style={{
                // Show the matching edge of the neighbor photo
                objectPosition:
                  overlapEdge.edge === "left" ? "right center"
                    : overlapEdge.edge === "right" ? "left center"
                    : overlapEdge.edge === "top" ? "center bottom"
                    : "center top",
              }}
            />
            {/* Fade gradient */}
            <div className={cn(
              "absolute inset-0",
              overlapEdge.edge === "left" && "bg-gradient-to-l from-transparent to-black/60",
              overlapEdge.edge === "right" && "bg-gradient-to-r from-transparent to-black/60",
              overlapEdge.edge === "top" && "bg-gradient-to-t from-transparent to-black/60",
              overlapEdge.edge === "bottom" && "bg-gradient-to-b from-transparent to-black/60",
            )} />
          </div>
        )}

        {/* ─── 3D Sphere Guide (top-left) ────────────────────── */}
        <div className="absolute top-12 left-3 z-20 safe-top">
          <SphereGuide
            capturedSet={capturedSet}
            activeIndex={activeIndex}
            currentHeading={heading ?? 0}
            currentPitch={pitch ?? 0}
            startHeading={startHeadingRef.current ?? 0}
            size={110}
          />
        </div>

        {/* ─── Pitch gauge (right side) ──────────────────────── */}
        {isTracking && !isComplete && activePos && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1">
            <PitchGauge
              currentPitch={pitch ?? 0}
              targetPitch={activePos.pitch}
            />
          </div>
        )}

        {/* Heading/pitch debug */}
        {isTracking && heading !== null && (
          <div className="absolute top-4 right-4 z-20 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1">
            <span className="text-[10px] font-mono text-white/50 tabular-nums">
              {heading}° h {pitch ?? "?"}° p
            </span>
          </div>
        )}

        {/* iOS permission prompt */}
        {permissionNeeded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
            <div className="text-center space-y-4 px-8">
              <p className="text-sm text-white/80">Enable gyroscope for guided capture?</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" size="sm" onClick={() => {/* skip */}}>Skip</Button>
                <Button size="sm" onClick={requestPermission}>Enable</Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Direction guidance ─────────────────────────────── */}
        {!isComplete && isReady && activePos && (
          <div className="absolute bottom-32 inset-x-0 flex flex-col items-center gap-2 animate-space-fade-in">
            {/* Ring info */}
            <div className="rounded-full bg-black/40 backdrop-blur-sm px-3 py-1">
              <span className="text-[10px] font-medium text-white/50">
                {RING_INFO[activePos.ring].label}
                {" "}({ringProgress[activePos.ring].done}/{ringProgress[activePos.ring].total})
              </span>
            </div>

            {/* Direction label */}
            <div className="flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-sm px-4 py-2">
              <span className="text-xs font-medium text-white/80">
                {activePos.pitch > 30 ? "↑" : activePos.pitch < -30 ? "↓" : "→"}
              </span>
              <span className={cn(
                "text-xs font-semibold transition-colors duration-200",
                alignment.aligned ? "text-space-success" : "text-space-cyan"
              )}>
                {getDirectionLabel(activeIndex!)}
              </span>
            </div>

            {/* Alignment indicators */}
            <div className="flex gap-3">
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded-full",
                alignment.headingAligned
                  ? "bg-space-cyan/20 text-space-cyan"
                  : "bg-white/5 text-white/30"
              )}>
                H {alignment.headingAligned ? "OK" : `${Math.round(alignment.headingDelta)}°`}
              </span>
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded-full",
                alignment.pitchAligned
                  ? "bg-space-cyan/20 text-space-cyan"
                  : "bg-white/5 text-white/30"
              )}>
                P {alignment.pitchAligned ? "OK" : `${Math.round(alignment.pitchDelta)}°`}
              </span>
            </div>
          </div>
        )}

        {/* ─── Completion overlay ─────────────────────────────── */}
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
              <h2 className="text-xl font-bold text-white">All {TOTAL_POSITIONS} captured!</h2>
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

      {/* ─── Bottom controls ───────────────────────────────────── */}
      <div className="relative z-30 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-4 px-4 safe-bottom">
        {/* Thumbnail strip */}
        {capturedCount > 0 && (
          <div
            ref={thumbStripRef}
            className="mb-4 flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1"
            role="list"
            aria-label="Captured photos"
          >
            {[...capturedMap.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([posIdx, src]) => (
                <div
                  key={posIdx}
                  role="listitem"
                  className={cn(
                    "shrink-0 size-14 rounded-lg overflow-hidden border-2 transition-all duration-200",
                    "animate-space-scale-in",
                    "border-white/10"
                  )}
                >
                  <img
                    src={src}
                    alt={`Photo ${CAPTURE_POSITIONS[posIdx]?.label ?? posIdx}`}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
          </div>
        )}

        {/* Capture button */}
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
              aria-label={`Capture photo ${capturedCount + 1} of ${TOTAL_POSITIONS}`}
            >
              <div
                className={cn(
                  "absolute inset-[4px] rounded-full bg-white transition-all duration-150",
                  isCapturing && "scale-90 bg-white/70"
                )}
              />
              {!isCapturing && (
                <div
                  className={cn(
                    "absolute -inset-1 rounded-full border transition-all duration-300",
                    alignment.aligned
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

// ── Pitch Gauge component ─────────────────────────────────────────────

function PitchGauge({ currentPitch, targetPitch }: { currentPitch: number; targetPitch: number }) {
  const gaugeH = 140;
  // Normalize -90..+90 → 0..1
  const currentNorm = (currentPitch + 90) / 180;
  const targetNorm = (targetPitch + 90) / 180;
  const currentY = (1 - currentNorm) * gaugeH;
  const targetY = (1 - targetNorm) * gaugeH;
  const diff = Math.abs(currentPitch - targetPitch);
  const isClose = diff <= 15;

  return (
    <div className="relative flex flex-col items-center" style={{ height: gaugeH }}>
      {/* Arrow hint */}
      {!isClose && currentPitch < targetPitch && (
        <ChevronUp className="size-3 text-space-cyan animate-bounce absolute -top-4" />
      )}

      {/* Gauge track */}
      <div className="w-1.5 h-full rounded-full bg-white/10 relative overflow-hidden">
        {/* Target zone */}
        <div
          className="absolute left-0 w-full bg-space-cyan/20 rounded-full"
          style={{
            top: Math.max(0, targetY - 10),
            height: 20,
          }}
        />
        {/* Current position indicator */}
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 size-3 rounded-full transition-colors duration-200",
            isClose ? "bg-space-cyan shadow-[0_0_6px_rgba(0,229,255,0.5)]" : "bg-white/60"
          )}
          style={{ top: currentY - 6 }}
        />
      </div>

      {/* Arrow hint */}
      {!isClose && currentPitch > targetPitch && (
        <ChevronDown className="size-3 text-space-cyan animate-bounce absolute -bottom-4" />
      )}

      {/* Label */}
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap">
        <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">pitch</span>
      </div>
    </div>
  );
}
