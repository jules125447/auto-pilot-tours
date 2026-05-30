import { supabase } from "@/integrations/supabase/client";

/**
 * Snap a series of GPS points to the most likely roads using Google Roads API
 * via our Supabase edge function (server-side gateway call).
 *
 * Quota notice: throttled to 1 call / 1.2s. Max 100 points per request.
 */

export interface SnapResult {
  snapped: [number, number];
  placeId: string | null;
}

let lastCallAt = 0;
const MIN_INTERVAL_MS = 1200;

interface SnappedPoint {
  location: { latitude: number; longitude: number };
  originalIndex?: number;
  placeId?: string;
}

export async function snapToRoad(
  path: [number, number][]
): Promise<SnapResult | null> {
  if (path.length === 0) return null;

  const now = Date.now();
  if (now - lastCallAt < MIN_INTERVAL_MS) return null;
  lastCallAt = now;

  const trimmed = path.slice(-100);

  try {
    const { data, error } = await supabase.functions.invoke("google-roads-snap", {
      body: { path: trimmed, interpolate: false },
    });
    if (error || !data) return null;
    const points: SnappedPoint[] = data.snappedPoints || [];
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

export async function nearestRoad(
  point: [number, number]
): Promise<SnapResult | null> {
  // Use single-point snap (path of 1)
  try {
    const { data, error } = await supabase.functions.invoke("google-roads-snap", {
      body: { path: [point], interpolate: false },
    });
    if (error || !data) return null;
    const p: SnappedPoint | undefined = data.snappedPoints?.[0];
    if (!p) return null;
    return {
      snapped: [p.location.latitude, p.location.longitude],
      placeId: p.placeId ?? null,
    };
  } catch {
    return null;
  }
}
