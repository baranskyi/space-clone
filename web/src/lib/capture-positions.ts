/**
 * Spherical capture positions — 22-point layout for full sphere coverage.
 *
 * Ring layout (compatible with Hugin stitching):
 *   Zenith  (+90°)  : 1 photo
 *   Upper   (+55°)  : 6 photos, 60° apart
 *   Equator ( 0°)   : 8 photos, 45° apart
 *   Lower   (-55°)  : 6 photos, 60° apart, offset 30°
 *   Nadir   (-90°)  : 1 photo
 *
 * ~90° FOV smartphone camera ensures 30-40% overlap between adjacent positions.
 */

export type RingName = "zenith" | "upper" | "equator" | "lower" | "nadir";

export interface CapturePosition {
  index: number;
  ring: RingName;
  /** 0-360 heading (yaw) */
  heading: number;
  /** -90 (floor) to +90 (ceiling) pitch */
  pitch: number;
  label: string;
}

// ── Position definitions ─────────────────────────────────────────────

function buildPositions(): CapturePosition[] {
  const positions: CapturePosition[] = [];
  let idx = 0;

  // Zenith (+90°) — 1 photo, heading irrelevant (use 0)
  positions.push({
    index: idx++,
    ring: "zenith",
    heading: 0,
    pitch: 90,
    label: "Ceiling",
  });

  // Upper ring (+55°) — 6 photos, 60° apart
  for (let i = 0; i < 6; i++) {
    positions.push({
      index: idx++,
      ring: "upper",
      heading: i * 60,
      pitch: 55,
      label: `Upper ${i + 1}/6`,
    });
  }

  // Equator (0°) — 8 photos, 45° apart
  const eqLabels = ["Front", "Front-Right", "Right", "Back-Right", "Back", "Back-Left", "Left", "Front-Left"];
  for (let i = 0; i < 8; i++) {
    positions.push({
      index: idx++,
      ring: "equator",
      heading: i * 45,
      pitch: 0,
      label: eqLabels[i],
    });
  }

  // Lower ring (-55°) — 6 photos, 60° apart, offset 30°
  for (let i = 0; i < 6; i++) {
    positions.push({
      index: idx++,
      ring: "lower",
      heading: i * 60 + 30,
      pitch: -55,
      label: `Lower ${i + 1}/6`,
    });
  }

  // Nadir (-90°) — 1 photo, heading irrelevant (use 0)
  positions.push({
    index: idx++,
    ring: "nadir",
    heading: 0,
    pitch: -90,
    label: "Floor",
  });

  return positions;
}

export const CAPTURE_POSITIONS: CapturePosition[] = buildPositions();
export const TOTAL_POSITIONS = CAPTURE_POSITIONS.length; // 22

// ── Ring metadata ────────────────────────────────────────────────────

export const RING_INFO: Record<RingName, { label: string; count: number }> = {
  zenith: { label: "Ceiling", count: 1 },
  upper: { label: "Upper Ring", count: 6 },
  equator: { label: "Equator", count: 8 },
  lower: { label: "Lower Ring", count: 6 },
  nadir: { label: "Floor", count: 1 },
};

// ── Adjacency ────────────────────────────────────────────────────────

/**
 * Pre-computed adjacency map: position index → array of neighbor indices.
 * Adjacent = within the same ring (neighbors) + directly above/below in adjacent rings.
 */
function buildAdjacency(): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  const p = CAPTURE_POSITIONS;

  for (let i = 0; i < p.length; i++) {
    const neighbors: number[] = [];

    for (let j = 0; j < p.length; j++) {
      if (i === j) continue;
      const hDiff = angleDiff(p[i].heading, p[j].heading);
      const pDiff = Math.abs(p[i].pitch - p[j].pitch);

      // Same ring, adjacent heading
      if (p[i].ring === p[j].ring && p[i].ring === "equator" && hDiff <= 50) {
        neighbors.push(j);
      } else if (p[i].ring === p[j].ring && p[i].ring !== "equator" && p[i].ring !== "zenith" && p[i].ring !== "nadir" && hDiff <= 65) {
        neighbors.push(j);
      }
      // Zenith/nadir connects to all positions in upper/lower ring
      else if ((p[i].ring === "zenith" && p[j].ring === "upper") ||
               (p[i].ring === "nadir" && p[j].ring === "lower")) {
        neighbors.push(j);
      }
      else if ((p[j].ring === "zenith" && p[i].ring === "upper") ||
               (p[j].ring === "nadir" && p[i].ring === "lower")) {
        neighbors.push(j);
      }
      // Cross-ring: upper↔equator or equator↔lower (close heading)
      else if (
        ((p[i].ring === "upper" && p[j].ring === "equator") ||
         (p[i].ring === "equator" && p[j].ring === "upper") ||
         (p[i].ring === "equator" && p[j].ring === "lower") ||
         (p[i].ring === "lower" && p[j].ring === "equator")) &&
        hDiff <= 35
      ) {
        neighbors.push(j);
      }
    }

    adj.set(i, neighbors);
  }

  return adj;
}

const ADJACENCY_MAP = buildAdjacency();

export function getAdjacentPositions(positionIndex: number): number[] {
  return ADJACENCY_MAP.get(positionIndex) ?? [];
}

// ── Alignment detection ──────────────────────────────────────────────

/** Smallest angle between two compass headings (0-180). */
function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

export interface AlignmentResult {
  aligned: boolean;
  headingAligned: boolean;
  pitchAligned: boolean;
  headingDelta: number;
  pitchDelta: number;
}

/**
 * Check if user's current orientation is aligned with a capture position.
 * For zenith/nadir, heading is ignored — only pitch matters.
 */
export function isAlignedWithPosition(
  heading: number,
  pitch: number,
  positionIndex: number,
  startHeading: number,
  headingTolerance: number = 15,
  pitchTolerance: number = 15,
): AlignmentResult {
  const pos = CAPTURE_POSITIONS[positionIndex];
  if (!pos) {
    return { aligned: false, headingAligned: false, pitchAligned: false, headingDelta: 999, pitchDelta: 999 };
  }

  const pitchDelta = Math.abs(pitch - pos.pitch);
  const pitchAligned = pitchDelta <= pitchTolerance;

  // Zenith/nadir: heading is irrelevant
  if (pos.ring === "zenith" || pos.ring === "nadir") {
    return {
      aligned: pitchAligned,
      headingAligned: true,
      pitchAligned,
      headingDelta: 0,
      pitchDelta,
    };
  }

  const targetHeading = (startHeading + pos.heading) % 360;
  const headingDelta = angleDiff(heading, targetHeading);
  const headingAligned = headingDelta <= headingTolerance;

  return {
    aligned: headingAligned && pitchAligned,
    headingAligned,
    pitchAligned,
    headingDelta,
    pitchDelta,
  };
}

// ── Smart ordering ───────────────────────────────────────────────────

/** Preferred capture order: equator first, then upper, lower, zenith, nadir. */
const RING_PRIORITY: RingName[] = ["equator", "upper", "lower", "zenith", "nadir"];

/**
 * Suggest the nearest uncaptured position to the user's current orientation.
 * Prefers equator ring first, then branches out.
 */
export function getNextUncaptured(
  capturedSet: Set<number>,
  currentHeading: number,
  currentPitch: number,
  startHeading: number,
): number | null {
  // Group uncaptured by ring priority
  for (const ring of RING_PRIORITY) {
    const candidates = CAPTURE_POSITIONS.filter(
      (p) => p.ring === ring && !capturedSet.has(p.index)
    );
    if (candidates.length === 0) continue;

    // Find nearest in this ring
    let best: CapturePosition | null = null;
    let bestDist = Infinity;

    for (const c of candidates) {
      const targetH = (startHeading + c.heading) % 360;
      const hDiff = angleDiff(currentHeading, targetH);
      const pDiff = Math.abs(currentPitch - c.pitch);
      // Weighted distance — heading and pitch in degrees
      const dist = hDiff + pDiff * 1.5; // pitch costs more effort
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }

    if (best) return best.index;
  }

  return null;
}

/**
 * Get ring progress: how many captured in each ring.
 */
export function getRingProgress(capturedSet: Set<number>): Record<RingName, { done: number; total: number }> {
  const progress: Record<RingName, { done: number; total: number }> = {
    zenith: { done: 0, total: 1 },
    upper: { done: 0, total: 6 },
    equator: { done: 0, total: 8 },
    lower: { done: 0, total: 6 },
    nadir: { done: 0, total: 1 },
  };

  for (const idx of capturedSet) {
    const pos = CAPTURE_POSITIONS[idx];
    if (pos) progress[pos.ring].done++;
  }

  return progress;
}

/**
 * Get direction guidance text for a position.
 */
export function getDirectionLabel(positionIndex: number): string {
  const pos = CAPTURE_POSITIONS[positionIndex];
  if (!pos) return "";

  switch (pos.ring) {
    case "zenith": return "Point camera at ceiling";
    case "nadir": return "Point camera at floor";
    case "upper": return `Look up ${pos.label}`;
    case "lower": return `Look down ${pos.label}`;
    case "equator": return pos.label;
  }
}

/**
 * Get pitch guidance text.
 */
export function getPitchGuidance(positionIndex: number): string {
  const pos = CAPTURE_POSITIONS[positionIndex];
  if (!pos) return "";

  switch (pos.ring) {
    case "zenith": return "Straight up";
    case "upper": return "Tilt up ~55°";
    case "equator": return "Level";
    case "lower": return "Tilt down ~55°";
    case "nadir": return "Straight down";
  }
}
