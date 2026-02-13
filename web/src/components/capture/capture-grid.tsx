"use client";

import { useEffect, useRef } from "react";
import { CAPTURE_POSITIONS } from "@/lib/capture-positions";

// ── Constants ──────────────────────────────────────────────────────────

const DEG = Math.PI / 180;
const HFOV = 70; // horizontal field of view in degrees
const RING_PITCHES = [72.5, 27.5, -27.5, -72.5];

// ── Cell definitions (computed once) ───────────────────────────────────

interface CellDef {
  posIndex: number;
  pTop: number;
  pBot: number;
  hStart: number;
  hEnd: number;
  isCap: boolean;
}

const CELLS: CellDef[] = (() => {
  const c: CellDef[] = [];
  // Zenith cap (index 0)
  c.push({ posIndex: 0, pTop: 90, pBot: 72.5, hStart: 0, hEnd: 360, isCap: true });
  // Upper ring (indices 1-6): 6 cells x 60deg
  for (let i = 0; i < 6; i++)
    c.push({ posIndex: 1 + i, pTop: 72.5, pBot: 27.5, hStart: i * 60, hEnd: (i + 1) * 60, isCap: false });
  // Equator ring (indices 7-14): 8 cells x 45deg
  for (let i = 0; i < 8; i++)
    c.push({ posIndex: 7 + i, pTop: 27.5, pBot: -27.5, hStart: i * 45, hEnd: (i + 1) * 45, isCap: false });
  // Lower ring (indices 15-20): 6 cells x 60deg, offset 30deg
  for (let i = 0; i < 6; i++)
    c.push({ posIndex: 15 + i, pTop: -27.5, pBot: -72.5, hStart: i * 60 + 30, hEnd: (i + 1) * 60 + 30, isCap: false });
  // Nadir cap (index 21)
  c.push({ posIndex: 21, pTop: -72.5, pBot: -90, hStart: 0, hEnd: 360, isCap: true });
  return c;
})();

// ── Projection: pinhole camera model ───────────────────────────────────

interface Pt2D {
  x: number;
  y: number;
  behind: boolean;
}

/**
 * Project a grid point (heading relative to startHeading, pitch) to screen coords.
 * Camera orientation is defined by absolute heading + pitch.
 */
function proj(
  gridH: number,
  gridP: number,
  camH: number,
  camP: number,
  startH: number,
  f: number,
  cx: number,
  cy: number,
): Pt2D {
  // Heading relative to camera
  const relH = (startH + gridH - camH) * DEG;
  const p = gridP * DEG;
  const cp = camP * DEG;

  // Spherical to cartesian (Y=up, Z=forward, X=right)
  const x = Math.cos(p) * Math.sin(relH);
  const y = Math.sin(p);
  const z = Math.cos(p) * Math.cos(relH);

  // Rotate by camera pitch around X axis
  const yR = y * Math.cos(cp) - z * Math.sin(cp);
  const zR = y * Math.sin(cp) + z * Math.cos(cp);

  if (zR <= 0.01) return { x: 0, y: 0, behind: true };

  return {
    x: cx + f * (x / zR),
    y: cy - f * (yR / zR),
    behind: false,
  };
}

// ── Component ──────────────────────────────────────────────────────────

interface CaptureGridProps {
  capturedSet: Set<number>;
  activeIndex: number | null;
  cameraHeading: number;
  cameraPitch: number;
  startHeading: number;
}

export function CaptureGrid(props: CaptureGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const animRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Keep props ref current (updated synchronously on render)
  propsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let t = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: rect.width, h: rect.height };
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!running || !ctx) return;

      t += 0.04;
      const pulse = 0.5 + 0.5 * Math.sin(t);
      const { capturedSet, activeIndex, cameraHeading, cameraPitch, startHeading } = propsRef.current;
      const { w, h } = sizeRef.current;

      if (w === 0) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const cx = w / 2;
      const cy = h / 2;
      const f = (w / 2) / Math.tan((HFOV / 2) * DEG);

      ctx.clearRect(0, 0, w, h);

      const p = (gH: number, gP: number): Pt2D =>
        proj(gH, gP, cameraHeading, cameraPitch, startHeading, f, cx, cy);

      // ── Layer 1: Captured cell fills ───────────────────────────
      for (const cell of CELLS) {
        if (!capturedSet.has(cell.posIndex)) continue;
        fillCell(ctx, cell, p, "rgba(0,229,255,0.10)");
      }

      // ── Layer 2: Active cell highlight ─────────────────────────
      if (activeIndex !== null) {
        const ac = CELLS.find((c) => c.posIndex === activeIndex);
        if (ac) {
          fillCell(ctx, ac, p, `rgba(0,229,255,${(0.05 + pulse * 0.05).toFixed(3)})`);
          strokeCell(ctx, ac, p, `rgba(0,229,255,${(0.4 + pulse * 0.4).toFixed(2)})`, 2.5);
        }
      }

      // ── Layer 3: Wireframe ─────────────────────────────────────
      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      // Horizontal ring lines
      for (const rp of RING_PITCHES) addRing(ctx, rp, p);

      // Vertical lines — upper band (6 x 60deg)
      for (let i = 0; i < 6; i++) addVert(ctx, i * 60, 72.5, 27.5, p);
      // Vertical lines — equator band (8 x 45deg)
      for (let i = 0; i < 8; i++) addVert(ctx, i * 45, 27.5, -27.5, p);
      // Vertical lines — lower band (6 x 60deg, offset 30deg)
      for (let i = 0; i < 6; i++) addVert(ctx, i * 60 + 30, -27.5, -72.5, p);

      ctx.stroke();

      // ── Layer 4: Cell labels ───────────────────────────────────
      for (const cell of CELLS) {
        drawLabel(
          ctx,
          cell,
          capturedSet.has(cell.posIndex),
          cell.posIndex === activeIndex,
          p,
          pulse,
        );
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full pointer-events-none"
      style={{ zIndex: 5 }}
      aria-hidden="true"
    />
  );
}

// ── Drawing helpers ────────────────────────────────────────────────────

type PFn = (h: number, p: number) => Pt2D;

/** Collect projected polygon vertices for a cell. */
function cellPoints(cell: CellDef, p: PFn): { x: number; y: number }[] {
  const S = 4; // sampling step in degrees
  const pts: { x: number; y: number }[] = [];

  if (cell.isCap) {
    // Cap: trace the boundary ring + pole
    const ringP = cell.pBot > 0 ? cell.pBot : cell.pTop; // 72.5 or -72.5
    for (let h = 0; h < 360; h += S) {
      const pt = p(h, ringP);
      if (!pt.behind) pts.push(pt);
    }
    const pole = p(0, cell.pBot > 0 ? 90 : -90);
    if (!pole.behind) pts.push(pole);
    return pts;
  }

  // Regular cell: trace boundary clockwise
  // Top edge: left → right
  for (let h = cell.hStart; h <= cell.hEnd; h += S) {
    const pt = p(h, cell.pTop);
    if (!pt.behind) pts.push(pt);
  }
  // Right edge: top → bottom
  for (let pitch = cell.pTop - S; pitch >= cell.pBot; pitch -= S) {
    const pt = p(cell.hEnd, pitch);
    if (!pt.behind) pts.push(pt);
  }
  // Bottom edge: right → left
  for (let h = cell.hEnd; h >= cell.hStart; h -= S) {
    const pt = p(h, cell.pBot);
    if (!pt.behind) pts.push(pt);
  }
  // Left edge: bottom → top
  for (let pitch = cell.pBot + S; pitch < cell.pTop; pitch += S) {
    const pt = p(cell.hStart, pitch);
    if (!pt.behind) pts.push(pt);
  }

  return pts;
}

function fillCell(ctx: CanvasRenderingContext2D, cell: CellDef, p: PFn, fill: string) {
  const pts = cellPoints(cell, p);
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeCell(ctx: CanvasRenderingContext2D, cell: CellDef, p: PFn, stroke: string, lw: number) {
  const pts = cellPoints(cell, p);
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Add horizontal ring line segments to the current path. */
function addRing(ctx: CanvasRenderingContext2D, pitch: number, p: PFn) {
  let drawing = false;
  for (let h = 0; h <= 360; h += 2) {
    const pt = p(h, pitch);
    if (!pt.behind) {
      if (drawing) ctx.lineTo(pt.x, pt.y);
      else { ctx.moveTo(pt.x, pt.y); drawing = true; }
    } else {
      drawing = false;
    }
  }
}

/** Add vertical line segments to the current path. */
function addVert(ctx: CanvasRenderingContext2D, heading: number, pTop: number, pBot: number, p: PFn) {
  let drawing = false;
  for (let pitch = pTop; pitch >= pBot; pitch -= 2) {
    const pt = p(heading, pitch);
    if (!pt.behind) {
      if (drawing) ctx.lineTo(pt.x, pt.y);
      else { ctx.moveTo(pt.x, pt.y); drawing = true; }
    } else {
      drawing = false;
    }
  }
}

/** Draw cell label: checkmark (captured), target reticle (active), or dim dot. */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  cell: CellDef,
  captured: boolean,
  active: boolean,
  p: PFn,
  pulse: number,
) {
  const pos = CAPTURE_POSITIONS[cell.posIndex];
  const pt = p(pos.heading, pos.pitch);
  if (pt.behind) return;

  if (captured) {
    // Checkmark
    ctx.strokeStyle = "rgba(0,229,255,0.8)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pt.x - 5, pt.y);
    ctx.lineTo(pt.x - 1, pt.y + 4);
    ctx.lineTo(pt.x + 6, pt.y - 4);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
  } else if (active) {
    // Target reticle — pulsing circle + tick marks + center dot
    const r = 12 + pulse * 3;
    ctx.strokeStyle = `rgba(0,229,255,${(0.5 + pulse * 0.3).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.stroke();

    const tk = 4;
    ctx.beginPath();
    ctx.moveTo(pt.x - r - tk, pt.y);
    ctx.lineTo(pt.x - r + tk, pt.y);
    ctx.moveTo(pt.x + r - tk, pt.y);
    ctx.lineTo(pt.x + r + tk, pt.y);
    ctx.moveTo(pt.x, pt.y - r - tk);
    ctx.lineTo(pt.x, pt.y - r + tk);
    ctx.moveTo(pt.x, pt.y + r - tk);
    ctx.lineTo(pt.x, pt.y + r + tk);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,229,255,${(0.6 + pulse * 0.3).toFixed(2)})`;
    ctx.fill();
  } else {
    // Dim dot
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();
  }
}
