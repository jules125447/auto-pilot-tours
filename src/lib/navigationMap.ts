import L from "leaflet";

export type MapLatLng = [number, number];

export const MOBILE_TRACK_ANCHOR_Y = 0.82;
export const DESKTOP_TRACK_ANCHOR_Y = 0.8;

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
      keepBuffer: 4,
      maxZoom: 19,
      subdomains: "abcd",
    },
  },
  {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      crossOrigin: true,
      detectRetina: true,
      keepBuffer: 4,
      maxZoom: 19,
      subdomains: "abc",
    },
  },
];

export function createBaseTileLayer(source: TileSource) {
  return L.tileLayer(source.url, source.options);
}

export function getTrackingAnchorY(mapWidth: number) {
  return mapWidth < 768 ? MOBILE_TRACK_ANCHOR_Y : DESKTOP_TRACK_ANCHOR_Y;
}

export function getTrackingZoom(mapWidth: number, currentZoom: number) {
  return mapWidth < 768 ? Math.max(currentZoom, 17) : Math.max(currentZoom, 16);
}

export function centerMapOnAnchoredPoint(
  map: L.Map,
  pos: MapLatLng,
  anchorY: number,
  zoom: number
) {
  map.setView(pos, zoom, { animate: false });

  const mapSize = map.getSize();
  const targetPoint = L.point(mapSize.x / 2, mapSize.y * anchorY);
  const userPoint = map.latLngToContainerPoint(pos);
  const centerPoint = L.point(mapSize.x / 2, mapSize.y / 2);
  const anchoredCenter = map.containerPointToLatLng(
    centerPoint.add(userPoint.subtract(targetPoint))
  );

  map.setView(anchoredCenter, zoom, { animate: false });
}

export function findClosestRouteIndex(route: MapLatLng[], pos: MapLatLng): number {
  let minDist = Infinity;
  let idx = 0;

  for (let i = 0; i < route.length; i++) {
    const d = (route[i][0] - pos[0]) ** 2 + (route[i][1] - pos[1]) ** 2;
    if (d < minDist) {
      minDist = d;
      idx = i;
    }
  }

  return idx;
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