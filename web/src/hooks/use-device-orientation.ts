"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DeviceOrientationState {
  /** Compass heading in degrees (0-360), null if unavailable */
  heading: number | null;
  /** Device pitch in degrees (-90 floor to +90 ceiling), null if unavailable */
  pitch: number | null;
  /** Whether orientation tracking is active */
  isTracking: boolean;
  /** Whether permission was requested (iOS 13+ requires explicit permission) */
  permissionNeeded: boolean;
  /** Request permission (needed on iOS) */
  requestPermission: () => Promise<void>;
}

export function useDeviceOrientation(): DeviceOrientationState {
  const [heading, setHeading] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const lastHeading = useRef<number | null>(null);
  const lastPitch = useRef<number | null>(null);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // ── Heading (yaw) ──────────────────────────────────────────────
    const compassHeading =
      (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading ?? null;
    const alpha = event.alpha;

    let newHeading: number | null = null;

    if (compassHeading !== null && compassHeading !== undefined) {
      newHeading = compassHeading;
    } else if (alpha !== null && alpha !== undefined) {
      // On Android, alpha goes counter-clockwise, compass is clockwise
      newHeading = (360 - alpha) % 360;
    }

    if (newHeading !== null) {
      const prev = lastHeading.current;
      if (prev === null || Math.abs(newHeading - prev) > 2) {
        lastHeading.current = newHeading;
        setHeading(Math.round(newHeading));
      }
    }

    // ── Pitch (tilt) ───────────────────────────────────────────────
    // beta: rotation around X axis (-180..180)
    //   In portrait mode, phone upright: beta ≈ 90
    //   Phone flat on table face up: beta ≈ 0 (or 180 face down)
    //   Phone pointing at ceiling: beta ≈ 0
    //
    // We normalize to: -90 (floor) to +90 (ceiling)
    //   phone level (horizontal, pointed forward) → pitch 0
    //   phone pointing up at ceiling → pitch +90
    //   phone pointing down at floor → pitch -90
    const beta = event.beta;
    const gamma = event.gamma;

    if (beta !== null && beta !== undefined) {
      let newPitch: number;

      if (gamma !== null && gamma !== undefined && Math.abs(gamma) > 90) {
        // Phone is upside-down orientation — edge case
        newPitch = beta > 0 ? 180 - beta : -180 - beta;
      } else {
        // Normal portrait orientation:
        // beta=90 → phone upright (camera level) → pitch 0
        // beta=0 → camera pointing at ceiling → pitch +90
        // beta=180 → camera pointing at floor → pitch -90
        newPitch = 90 - beta;
      }

      // Clamp to -90..+90
      newPitch = Math.max(-90, Math.min(90, newPitch));

      const prevP = lastPitch.current;
      if (prevP === null || Math.abs(newPitch - prevP) > 2) {
        lastPitch.current = newPitch;
        setPitch(Math.round(newPitch));
      }
    }

    setIsTracking(true);
  }, []);

  const requestPermission = useCallback(async () => {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof DOE.requestPermission === "function") {
      try {
        const permission = await DOE.requestPermission();
        if (permission === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
          setPermissionNeeded(false);
        }
      } catch {
        // User denied
      }
    }
  }, [handleOrientation]);

  useEffect(() => {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof DOE.requestPermission === "function") {
      setPermissionNeeded(true);
    } else {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [handleOrientation]);

  return { heading, pitch, isTracking, permissionNeeded, requestPermission };
}

/**
 * @deprecated Use isAlignedWithPosition from capture-positions.ts instead.
 * Kept for backward-compat during migration.
 */
export function isAlignedWithSlot(
  heading: number,
  startHeading: number,
  slotIndex: number,
  tolerance: number = 15
): boolean {
  const slotAngle = (slotIndex * 22.5) % 360;
  const targetHeading = (startHeading + slotAngle) % 360;
  let diff = Math.abs(heading - targetHeading);
  if (diff > 180) diff = 360 - diff;
  return diff <= tolerance;
}
