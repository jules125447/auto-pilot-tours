import { GOOGLE_MAPS_API_KEY, HAS_GOOGLE_MAPS_KEY } from "./platform";

/**
 * Snap a series of GPS points to the most likely roads using Google Roads API.
 * Returns the snapped lat/lng of the LAST point (the user's current position
 * corrected on the road network).
 *
 * Quota notice: 1 request per snap, throttle aggressively (>= 1.5s between calls).
 * Max 100 points per request.
 */

export interface SnapResult {
  snapped: [number, number];
  placeId: string | null;
}

const ENDPOINT = "https://roads.googleapis.com/v1/snapToRoads";

let lastCallAt = 0;
const MIN_INTERVAL_MS = 1200;

export async function snapToRoad(
  path: [number, number][]
): Promise<SnapResult | null> {
  if (!HAS_GOOGLE_MAPS_KEY || path.length === 0) return null;

  const now = Date.now();
  if (now - lastCallAt < MIN_INTERVAL_MS) return null;
  lastCallAt = now;

  const trimmed = path.slice(-100);
  const pathParam = trimmed.map(([lat, lng]) => `${lat},${lng}`).join("|");
  const url = `${ENDPOINT}?interpolate=false&path=${encodeURIComponent(
    pathParam
  )}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const points: Array<{
      location: { latitude: number; longitude: number };
      originalIndex?: number;
      placeId?: string;
    }> = data.snappedPoints || [];
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    return {
      snapped: [last.location.latitude, last.location.longitude],
      placeId: last.placeId ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Nearest road for a single point (fallback when not enough history yet).
 */
const NEAREST_ENDPOINT = "https://roads.googleapis.com/v1/nearestRoads";

export async function nearestRoad(
  point: [number, number]
): Promise<SnapResult | null> {
  if (!HAS_GOOGLE_MAPS_KEY) return null;
  const url = `${NEAREST_ENDPOINT}?points=${point[0]},${point[1]}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.snappedPoints?.[0];
    if (!p) return null;
    return {
      snapped: [p.location.latitude, p.location.longitude],
      placeId: p.placeId ?? null,
    };
  } catch {
    return null;
  }
}
