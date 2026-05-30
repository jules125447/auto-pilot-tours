import { GOOGLE_MAPS_API_KEY, HAS_GOOGLE_MAPS_KEY } from "./platform";
import type { RouteResult, RouteStep } from "@/lib/routing";

const ENDPOINT = "https://maps.googleapis.com/maps/api/directions/json";

/**
 * Google Directions API caller. Browser-restricted keys CAN call this from
 * web (CORS allowed). Returns the same shape as our OSRM-based RouteResult.
 *
 * Maneuvers mapping: Google returns strings like "turn-left", "turn-right",
 * "roundabout-left", "uturn-right", "merge", "fork-right". We normalize to
 * the OSRM-ish shape our DirectionBanner expects.
 */

interface GoogleStep {
  html_instructions: string;
  distance: { value: number };
  duration: { value: number };
  maneuver?: string;
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
}

interface GoogleLeg {
  steps: GoogleStep[];
  distance: { value: number };
  duration: { value: number };
}

interface GoogleRoute {
  overview_polyline: { points: string };
  legs: GoogleLeg[];
}

// Polyline decoder (Google encoded polyline algorithm format)
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mapManeuver(g?: string): { type: string; modifier?: string } {
  if (!g) return { type: "straight" };
  if (g.startsWith("turn-")) return { type: "turn", modifier: g.replace("turn-", "") };
  if (g.startsWith("uturn")) return { type: "turn", modifier: "uturn" };
  if (g.startsWith("roundabout") || g.startsWith("rotary"))
    return { type: "roundabout turn", modifier: g.split("-")[1] };
  if (g === "merge") return { type: "merge" };
  if (g.startsWith("fork-")) return { type: "fork", modifier: g.replace("fork-", "") };
  if (g.startsWith("ramp-")) return { type: "on ramp", modifier: g.replace("ramp-", "") };
  return { type: g };
}

export async function fetchGoogleDirections(
  waypoints: [number, number][],
  options?: { signal?: AbortSignal }
): Promise<RouteResult | null> {
  if (!HAS_GOOGLE_MAPS_KEY || waypoints.length < 2) return null;

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const intermediates = waypoints.slice(1, -1);

  const params = new URLSearchParams({
    origin: `${origin[0]},${origin[1]}`,
    destination: `${destination[0]},${destination[1]}`,
    mode: "driving",
    language: "fr",
    region: "fr",
    key: GOOGLE_MAPS_API_KEY,
  });
  if (intermediates.length > 0) {
    params.set(
      "waypoints",
      intermediates.map(([la, ln]) => `${la},${ln}`).join("|")
    );
  }

  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: options?.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.routes?.[0]) return null;

    const route: GoogleRoute = data.routes[0];
    const coordinates = decodePolyline(route.overview_polyline.points);

    let distance = 0;
    let duration = 0;
    const steps: RouteStep[] = [];
    for (const leg of route.legs) {
      distance += leg.distance.value;
      duration += leg.duration.value;
      for (const s of leg.steps) {
        const m = mapManeuver(s.maneuver);
        steps.push({
          maneuver: {
            type: m.type,
            modifier: m.modifier,
            location: [s.start_location.lng, s.start_location.lat],
          },
          distance: s.distance.value,
          duration: s.duration.value,
          name: stripHtml(s.html_instructions),
        });
      }
    }

    return { coordinates, distance, duration, steps };
  } catch {
    return null;
  }
}
