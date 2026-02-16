/**
 * OSRM-based routing utility for snap-to-road functionality.
 * Uses the free OSRM demo server to get driving routes between waypoints.
 */

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng][]
  distance: number; // meters
  duration: number; // seconds
}

/**
 * Get a driving route between waypoints using OSRM.
 * Returns the full road-snapped polyline.
 */
export async function getRoute(waypoints: [number, number][]): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  // OSRM expects lng,lat format
  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    // GeoJSON coordinates are [lng, lat], we convert to [lat, lng]
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );

    return {
      coordinates,
      distance: route.distance,
      duration: route.duration,
    };
  } catch {
    return null;
  }
}

/**
 * Get route segment between two points.
 */
export async function getRouteSegment(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult | null> {
  return getRoute([from, to]);
}

/**
 * Format distance in km or m.
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format duration in hours/minutes.
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h${mins > 0 ? ` ${mins}min` : ""}`;
  }
  return `${mins} min`;
}
