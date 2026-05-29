import maplibregl from "maplibre-gl";

export const OPENFREEMAP_STYLE_LIBERTY = "https://tiles.openfreemap.org/styles/liberty";
export const OPENFREEMAP_STYLE_POSITRON = "https://tiles.openfreemap.org/styles/positron";

/**
 * Default sober style for the app. Positron is the most "Apple-like" / sober
 * basemap from OpenFreeMap (light grays, very minimal labels) — perfect for
 * a tourist navigation app where the route polyline should dominate.
 */
export const DEFAULT_MAP_STYLE = OPENFREEMAP_STYLE_POSITRON;

export const TRACKING_ANCHOR_Y = 0.78;

export function getTrackingZoom(mapWidth: number, currentZoom: number) {
  return mapWidth < 768 ? Math.max(currentZoom, 17) : Math.max(currentZoom, 16);
}

/**
 * Compute the bottom padding (in px) needed to make the visual "center" of the
 * map land at `anchorY` of the screen instead of the geometric center.
 * Using padding lets MapLibre handle bearing rotation correctly: the camera
 * orbits around the padded center, so the user stays anchored even when the
 * map rotates.
 */
export function paddingForAnchor(mapHeight: number, anchorY: number) {
  // bottom padding shifts visual center upward
  // visualCenterY = (mapHeight - bottomPadding) / 2
  // we want visualCenterY = anchorY * mapHeight
  // → bottomPadding = mapHeight * (1 - 2 * anchorY) — but if anchorY > 0.5 we need TOP padding instead
  if (anchorY > 0.5) {
    return { top: mapHeight * (2 * anchorY - 1), bottom: 0, left: 0, right: 0 };
  }
  return { top: 0, bottom: mapHeight * (1 - 2 * anchorY), left: 0, right: 0 };
}

export function lngLat(latLng: [number, number]): [number, number] {
  // helper to convert from [lat, lng] (our app convention) to [lng, lat] (maplibre)
  return [latLng[1], latLng[0]];
}

export function routeToLineGeoJSON(route: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: route.map(([lat, lng]) => [lng, lat]),
    },
  };
}

export function emptyLineGeoJSON(): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: [] },
  };
}

export function computeBounds(route: [number, number][]): maplibregl.LngLatBounds | null {
  if (route.length === 0) return null;
  const bounds = new maplibregl.LngLatBounds();
  for (const [lat, lng] of route) {
    bounds.extend([lng, lat]);
  }
  return bounds;
}
