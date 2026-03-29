import { useState, useEffect } from "react";

/**
 * Lightweight hook that grabs user's current position once.
 * Used for showing distance from user to circuit start.
 */
export function useUserLocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        // silently fail — user may deny permission
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return position;
}
