"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DeviceOrientationState {
  /** Compass heading in degrees (0-360), null if unavailable */
  heading: number | null;
  /** Whether orientation tracking is active */
  isTracking: boolean;
  /** Whether permission was requested (iOS 13+ requires explicit permission) */
  permissionNeeded: boolean;
  /** Request permission (needed on iOS) */
  requestPermission: () => Promise<void>;
}

export function useDeviceOrientation(): DeviceOrientationState {
  const [heading, setHeading] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const lastHeading = useRef<number | null>(null);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // webkitCompassHeading is Safari-specific (iOS)
    const compassHeading =
      (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading ?? null;

    // alpha is the compass direction (0-360) on Android/Chrome
    const alpha = event.alpha;

    let newHeading: number | null = null;

    if (compassHeading !== null && compassHeading !== undefined) {
      newHeading = compassHeading;
    } else if (alpha !== null && alpha !== undefined) {
      // On Android, alpha goes counter-clockwise, compass is clockwise
      newHeading = (360 - alpha) % 360;
    }

    if (newHeading !== null) {
      // Only update if heading changed significantly (reduce re-renders)
      const prev = lastHeading.current;
      if (prev === null || Math.abs(newHeading - prev) > 2) {
        lastHeading.current = newHeading;
        setHeading(Math.round(newHeading));
        setIsTracking(true);
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // iOS 13+ requires explicit permission request
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
    // Check if DeviceOrientationEvent.requestPermission exists (iOS 13+)
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof DOE.requestPermission === "function") {
      // iOS — need to request permission first
      setPermissionNeeded(true);
    } else {
      // Android/desktop — just listen
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [handleOrientation]);

  return { heading, isTracking, permissionNeeded, requestPermission };
}

/**
 * Given a heading (0-360) and the target slot (0-15),
 * returns whether the user is pointing roughly at that slot.
 * Each slot covers 22.5 degrees.
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
