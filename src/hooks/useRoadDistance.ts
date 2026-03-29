import { useState, useEffect } from "react";
import { useUserLocation } from "@/hooks/useUserLocation";

interface RoadDistanceResult {
  distance: number; // meters
  duration: number; // seconds
}

/**
 * Hook that calculates road distance & duration from user to a given point via OSRM.
 */
export function useRoadDistance(targetLat?: number, targetLng?: number) {
  const userPos = useUserLocation();
  const [result, setResult] = useState<RoadDistanceResult | null>(null);

  useEffect(() => {
    if (!userPos || targetLat === undefined || targetLng === undefined) return;

    let cancelled = false;

    const fetchRoute = async () => {
      try {
        const coords = `${userPos[1]},${userPos[0]};${targetLng},${targetLat}`;
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.code !== "Ok" || !data.routes?.[0] || cancelled) return;
        setResult({
          distance: data.routes[0].distance,
          duration: data.routes[0].duration,
        });
      } catch {
        // silently fail
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [userPos, targetLat, targetLng]);

  return result;
}
