import { useState, useEffect } from "react";
import { ensureLocationPermission, getCurrentPositionUnified } from "@/lib/nativeGeolocation";

/**
 * Lightweight hook that grabs user's current position once.
 * Uses native Capacitor GPS on mobile, browser API on web.
 */
export function useUserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await ensureLocationPermission();
      if (!ok || cancelled) return;
      try {
        const pos = await getCurrentPositionUnified({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
        if (!cancelled) setPosition([pos.coords.latitude, pos.coords.longitude]);
      } catch {
        // silently fail — user may deny permission
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return position;
}
