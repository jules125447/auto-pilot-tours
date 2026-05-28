import L from "leaflet";

export type MapLatLng = [number, number];

export const TRACKING_ANCHOR_Y = 0.82;

interface TileSource {
  options: L.TileLayerOptions;
  url: string;
}

export const MAP_TILE_SOURCES: TileSource[] = [
  {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    options: {
      crossOrigin: true,
      detectRetina: true,
      keepBuffer: 6,
      maxZoom: 19,
      subdomains: "abcd",
    },
  },
  {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      crossOrigin: true,
      detectRetina: true,
      keepBuffer: 6,
      maxZoom: 19,
      subdomains: "abc",
    },
  },
  {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: {
      crossOrigin: true,
      detectRetina: true,
      keepBuffer: 4,
      maxZoom: 20,
      subdomains: "abcd",
    },
  },
];

export function createBaseTileLayer(source: TileSource) {
  return L.tileLayer(source.url, source.options);
}

export function getTrackingAnchorY(mapWidth: number, mapHeight: number) {
  void mapWidth;
  void mapHeight;
  return TRACKING_ANCHOR_Y;
}

export function getTrackingZoom(mapWidth: number, currentZoom: number) {
  return mapWidth < 768 ? Math.max(currentZoom, 17) : Math.max(currentZoom, 16);
}

export function centerMapOnAnchoredPoint(
  map: L.Map,
  pos: MapLatLng,
  anchorY: number,
  zoom: number,
  rotationDeg = 0,
  animate = false
) {
  const mapSize = map.getSize();
  const projectedUserPoint = map.project(L.latLng(pos[0], pos[1]), zoom);
  const anchorOffsetY = mapSize.y * (anchorY - 0.5);
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const anchoredCenterPoint = projectedUserPoint.add(
    L.point(
      anchorOffsetY * Math.sin(rotationRad),
      -anchorOffsetY * Math.cos(rotationRad)
    )
  );
  const anchoredCenter = map.unproject(anchoredCenterPoint, zoom);

  map.setView(anchoredCenter, zoom, { animate, duration: animate ? 1.0 : 0 });
}

export function findClosestRouteIndex(route: MapLatLng[], pos: MapLatLng): number {
  // Equirectangular projection so longitude is properly scaled by cos(lat).
  // Otherwise at mid/high latitudes a longitude-degree is much shorter than a
  // latitude-degree and the "closest vertex" answer drifts.
  const cosLat = Math.cos((pos[0] * Math.PI) / 180);
  let minDist = Infinity;
  let idx = 0;

  for (let i = 0; i < route.length; i++) {
    const dy = route[i][0] - pos[0];
    const dx = (route[i][1] - pos[1]) * cosLat;
    const d = dy * dy + dx * dx;
    if (d < minDist) {
      minDist = d;
      idx = i;
    }
  }

  return idx;
}

/**
 * Snap a user position onto the polyline. Returns the closest point on any
 * segment (not just the closest vertex) plus the segment index and lateral
 * distance in meters. Use this for "stick the arrow to the road" rendering
 * and for accurate polyline split between traveled/remaining.
 */
export function snapPositionToRoute(
  route: MapLatLng[],
  pos: MapLatLng
): { lat: number; lng: number; segmentIndex: number; lateralDistanceM: number } | null {
  if (route.length === 0) return null;
  if (route.length === 1) {
    return { lat: route[0][0], lng: route[0][1], segmentIndex: 0, lateralDistanceM: 0 };
  }

  const M_PER_DEG_LAT = 110574;
  const M_PER_DEG_LNG = 111320 * Math.cos((pos[0] * Math.PI) / 180);

  let bestSeg = 0;
  let bestT = 0;
  let bestDist2 = Infinity;

  for (let i = 0; i < route.length - 1; i++) {
    const ax = (route[i][1] - pos[1]) * M_PER_DEG_LNG;
    const ay = (route[i][0] - pos[0]) * M_PER_DEG_LAT;
    const bx = (route[i + 1][1] - pos[1]) * M_PER_DEG_LNG;
    const by = (route[i + 1][0] - pos[0]) * M_PER_DEG_LAT;
    const dx = bx - ax;
    const dy = by - ay;
    const segLen2 = dx * dx + dy * dy;
    let t = 0;
    if (segLen2 > 1e-9) {
      t = -(ax * dx + ay * dy) / segLen2;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d2 = px * px + py * py;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestSeg = i;
      bestT = t;
    }
  }

  const a = route[bestSeg];
  const b = route[bestSeg + 1];
  return {
    lat: a[0] + (b[0] - a[0]) * bestT,
    lng: a[1] + (b[1] - a[1]) * bestT,
    segmentIndex: bestSeg,
    lateralDistanceM: Math.sqrt(bestDist2),
  };
}

export function getRouteBearing(route: MapLatLng[], pos: MapLatLng): number {
  const idx = findClosestRouteIndex(route, pos);
  const startIdx = Math.max(0, idx - 1);
  const endIdx = Math.min(route.length - 1, idx + 6);
  const from = route[startIdx];
  const to = route[endIdx];

  if (from[0] === to[0] && from[1] === to[1]) return 0;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(to[1] - from[1]);
  const y = Math.sin(dLng) * Math.cos(toRad(to[0]));
  const x =
    Math.cos(toRad(from[0])) * Math.sin(toRad(to[0])) -
    Math.sin(toRad(from[0])) * Math.cos(toRad(to[0])) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}