"use client";

import { useEffect, useRef } from "react";
import {
  CAPTURE_POSITIONS,
  TOTAL_POSITIONS,
  type CapturePosition,
} from "@/lib/capture-positions";

/**
 * SphereGuide — Canvas 2D orthographic globe minimap showing 22 capture positions.
 *
 * Renders dots on a sphere using orthographic projection.
 * Sphere rotates to match phone orientation (heading + pitch).
 * Captured dots = cyan filled, active = pulsing ring, uncaptured = gray outline.
 */

interface SphereGuideProps {
  /** Set of captured position indices */
  capturedSet: Set<number>;
  /** Currently active (suggested) position index, or null */
  activeIndex: number | null;
  /** User's current heading relative to start (0-360) */
  currentHeading: number;
  /** User's current pitch (-90 to +90) */
  currentPitch: number;
  /** Start heading offset */
  startHeading: number;
  /** Canvas size in px */
  size?: number;
  className?: string;
}

// Colors matching the design system
const CYAN = "#00e5ff";
const CYAN_DIM = "rgba(0, 229, 255, 0.3)";
const GRAY = "rgba(255, 255, 255, 0.25)";
const GRAY_FILL = "rgba(255, 255, 255, 0.08)";
const WHITE_DIM = "rgba(255, 255, 255, 0.12)";

export function SphereGuide({
  capturedSet,
  activeIndex,
  currentHeading,
  currentPitch,
  startHeading,
  size = 120,
  className,
}: SphereGuideProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const pulseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let running = true;

    function draw() {
      if (!running || !ctx) return;

      pulseRef.current += 0.05;
      const pulse = 0.5 + 0.5 * Math.sin(pulseRef.current);

      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const R = size / 2 - 12; // globe radius

      // ── Draw globe outline ───────────────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = WHITE_DIM;
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Draw equator line (faint) ────────────────────────────
      // Rotated by current pitch
      const pitchRad = (-currentPitch * Math.PI) / 180;
      const eqY = cy + R * Math.sin(pitchRad);
      const eqRx = R * Math.cos(pitchRad);
      if (eqRx > 0) {
        ctx.beginPath();
        ctx.ellipse(cx, eqY, eqRx, eqRx * 0.15, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // ── Project and draw position dots ───────────────────────
      // Orthographic projection: rotate sphere so current view direction faces front
      const rotYaw = ((-currentHeading + startHeading) * Math.PI) / 180;
      const rotPitch = (-currentPitch * Math.PI) / 180;

      // Sort by depth (z) so front dots draw on top
      const projected = CAPTURE_POSITIONS.map((pos) =>
        projectPosition(pos, rotYaw, rotPitch, R, cx, cy, startHeading)
      ).sort((a, b) => a.z - b.z);

      for (const p of projected) {
        if (p.z < -0.1) continue; // behind the globe — skip

        const isCaptured = capturedSet.has(p.pos.index);
        const isActive = p.pos.index === activeIndex;
        const opacity = 0.3 + 0.7 * Math.max(0, p.z); // fade by depth
        const dotR = isCaptured || isActive ? 4 : 3;

        // Active position — pulsing ring
        if (isActive) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotR + 4 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 229, 255, ${0.3 * opacity * pulse})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, dotR + 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 229, 255, ${0.6 * opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Dot fill
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
        if (isCaptured) {
          ctx.fillStyle = `rgba(0, 229, 255, ${opacity})`;
        } else if (isActive) {
          ctx.fillStyle = `rgba(0, 229, 255, ${0.8 * opacity})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * opacity})`;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        ctx.fill();
      }

      // ── Crosshair: current view direction (always at center) ──
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx + 6, cy);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy + 6);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // ── Labels ─────────────────────────────────────────────────
      ctx.font = "bold 7px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Up/Down labels based on pitch
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText("UP", cx, 7);
      ctx.fillText("DN", cx, size - 5);

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [capturedSet, activeIndex, currentHeading, currentPitch, startHeading, size]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        aria-label={`Sphere guide: ${capturedSet.size} of ${TOTAL_POSITIONS} positions captured`}
        role="img"
      />
    </div>
  );
}

// ── Projection math ──────────────────────────────────────────────────

interface ProjectedDot {
  x: number;
  y: number;
  z: number; // depth for sorting (1 = front, -1 = back)
  pos: CapturePosition;
}

/**
 * Orthographic projection of a spherical position onto 2D canvas.
 * Rotates the sphere so the user's current view direction faces the viewer.
 */
function projectPosition(
  pos: CapturePosition,
  rotYaw: number,
  rotPitch: number,
  R: number,
  cx: number,
  cy: number,
  startHeading: number,
): ProjectedDot {
  // Convert position heading/pitch to 3D point on unit sphere
  const posHeadingRad = ((startHeading + pos.heading) * Math.PI) / 180;
  const posPitchRad = (pos.pitch * Math.PI) / 180;

  // Spherical to cartesian (Y=up, Z=forward, X=right)
  let x = Math.cos(posPitchRad) * Math.sin(posHeadingRad);
  let y = Math.sin(posPitchRad);
  let z = Math.cos(posPitchRad) * Math.cos(posHeadingRad);

  // Rotate by yaw (around Y axis)
  const cosY = Math.cos(rotYaw);
  const sinY = Math.sin(rotYaw);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;
  x = x1;
  z = z1;

  // Rotate by pitch (around X axis)
  const cosP = Math.cos(rotPitch);
  const sinP = Math.sin(rotPitch);
  const y1 = y * cosP - z * sinP;
  const z2 = y * sinP + z * cosP;
  y = y1;
  z = z2;

  // Orthographic: project x,y onto screen, z for depth
  return {
    x: cx + x * R,
    y: cy - y * R, // screen Y is flipped
    z,
    pos,
  };
}
