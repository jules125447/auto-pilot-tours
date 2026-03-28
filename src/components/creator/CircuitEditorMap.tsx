import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, X } from "lucide-react";
import type { StopData, AudioZoneData, MusicSegmentData, SoundSegmentData, EditorMode } from "@/pages/CircuitCreator";
import { AMBIENT_SOUNDS } from "@/lib/ambientSounds";

interface CircuitEditorMapProps {
  route: [number, number][];
  waypoints: [number, number][];
  stops: StopData[];
  audioZones: AudioZoneData[];
  musicSegments: MusicSegmentData[];
  soundSegments: SoundSegmentData[];
  musicPlacingStart: { lat: number; lng: number } | null;
  soundPlacingStart: { lat: number; lng: number } | null;
  mode: EditorMode;
  onMapClick: (lat: number, lng: number) => void;
  onWaypointDrag: (index: number, lat: number, lng: number) => void;
  onStopDrag?: (id: string, lat: number, lng: number) => void;
  onAudioDrag?: (id: string, lat: number, lng: number) => void;
  onMusicDrag?: (id: string, point: "start" | "end", lat: number, lng: number) => void;
  selectedStopId: string | null;
  selectedAudioId: string | null;
  selectedMusicId: string | null;
  selectedSoundId: string | null;
  routeLoading: boolean;
  onMapReady?: (map: L.Map) => void;
}

const stopIcons: Record<string, string> = {
  viewpoint: "👁️",
  restaurant: "🍽️",
  parking: "🅿️",
  site: "🏛️",
};

const cursorByMode: Record<EditorMode, string> = {
  route: "crosshair",
  stop: "copy",
  audio: "cell",
  music: "crosshair",
  sound: "crosshair",
  select: "default",
};

const waypointLabel = (i: number) => String.fromCharCode(65 + i);

const estimateAudioDistance = (text: string): number => {
  if (!text.trim()) return 50;
  const words = text.trim().split(/\s+/).length;
  const durationSec = Math.ceil((words / 150) * 60);
  const speedMs = (40 * 1000) / 3600;
  return Math.max(50, Math.round(durationSec * speedMs));
};

function findClosestRoutePoint(route: [number, number][], lat: number, lng: number): { index: number; distAlongRoute: number } {
  let minDist = Infinity;
  let idx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = (route[i][0] - lat) ** 2 + (route[i][1] - lng) ** 2;
    if (d < minDist) { minDist = d; idx = i; }
  }
  let distAlong = 0;
  for (let i = 0; i < idx; i++) {
    const dlat = route[i + 1][0] - route[i][0];
    const dlng = route[i + 1][1] - route[i][1];
    distAlong += Math.sqrt(dlat * dlat + dlng * dlng) * 111320;
  }
  return { index: idx, distAlongRoute: distAlong };
}

function getPointAtDistance(route: [number, number][], startIdx: number, distanceMeters: number): [number, number] | null {
  let remaining = distanceMeters;
  for (let i = startIdx; i < route.length - 1; i++) {
    const dlat = route[i + 1][0] - route[i][0];
    const dlng = route[i + 1][1] - route[i][1];
    const segDist = Math.sqrt(dlat * dlat + dlng * dlng) * 111320;
    if (remaining <= segDist) {
      const ratio = remaining / segDist;
      return [route[i][0] + dlat * ratio, route[i][1] + dlng * ratio];
    }
    remaining -= segDist;
  }
  return route[route.length - 1];
}

const CircuitEditorMap = ({
  route, waypoints, stops, audioZones, musicSegments, soundSegments,
  musicPlacingStart, soundPlacingStart, mode, onMapClick, onWaypointDrag,
  onStopDrag, onAudioDrag, onMusicDrag,
  selectedStopId, selectedAudioId, selectedMusicId, selectedSoundId,
  routeLoading, onMapReady,
}: CircuitEditorMapProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setSearchResults([]); setShowResults(false); return; }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&accept-language=fr&addressdetails=1`);
        const data = await res.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch { setSearchResults([]); }
      setIsSearching(false);
    }, 350);
  }, []);

  const selectPlace = useCallback((lat: string, lon: string, boundingbox?: string[]) => {
    const map = mapInstance.current;
    if (!map) return;
    if (boundingbox && boundingbox.length === 4) {
      const bounds = L.latLngBounds(
        [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])],
        [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])]
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
    } else {
      map.setView([parseFloat(lat), parseFloat(lon)], 15, { animate: true });
    }
    setShowResults(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    polyline: L.Polyline | null;
    waypointMarkers: L.Marker[];
    stopMarkers: L.Marker[];
    audioMarkers: (L.Marker | L.Polyline)[];
    musicMarkers: L.Marker[];
    musicLines: L.Polyline[];
    musicPlacingMarker: L.Marker | null;
    soundMarkers: L.Marker[];
    soundLines: L.Polyline[];
    soundPlacingMarker: L.Marker | null;
  }>({ polyline: null, waypointMarkers: [], stopMarkers: [], audioMarkers: [], musicMarkers: [], musicLines: [], musicPlacingMarker: null, soundMarkers: [], soundLines: [], soundPlacingMarker: null });

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { center: [46.8, 2.3], zoom: 6, zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    mapInstance.current = map;
    onMapReady?.(map);
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onMapClick]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.style.cursor = cursorByMode[mode];
  }, [mode]);

  // Route polyline + waypoints
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    if (layers.polyline) map.removeLayer(layers.polyline);
    layers.waypointMarkers.forEach((m) => map.removeLayer(m));
    layers.waypointMarkers = [];

    if (route.length > 1) {
      layers.polyline = L.polyline(route, { color: "hsl(152, 45%, 28%)", weight: 5, opacity: 0.85, smoothFactor: 1, lineCap: "round", lineJoin: "round" }).addTo(map);
    } else {
      layers.polyline = null;
    }

    waypoints.forEach((point, i) => {
      const label = waypointLabel(i);
      const isFirst = i === 0;
      const isLast = i === waypoints.length - 1;
      const color = isFirst ? "hsl(152, 45%, 28%)" : isLast ? "hsl(0, 84%, 60%)" : "hsl(35, 85%, 55%)";
      const icon = L.divIcon({
        html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;cursor:grab;">${label}</div>`,
        className: "custom-marker", iconSize: [28, 28], iconAnchor: [14, 14],
      });
      const marker = L.marker(point, { icon, draggable: true }).addTo(map);
      marker.bindTooltip(isFirst ? `Départ (${label})` : isLast ? `Arrivée (${label})` : `Point ${label}`, { direction: "top", offset: [0, -16] });
      marker.on("dragend", () => { const pos = marker.getLatLng(); onWaypointDrag(i, pos.lat, pos.lng); });
      layers.waypointMarkers.push(marker);
    });
  }, [route, waypoints, onWaypointDrag]);

  // Stops
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    layers.stopMarkers.forEach((m) => map.removeLayer(m));
    layers.stopMarkers = [];
    stops.forEach((stop) => {
      const isSelected = stop.id === selectedStopId;
      const icon = L.divIcon({
        html: `<div style="background:${isSelected ? "hsl(35,85%,55%)" : "white"};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-size:18px;border:2px solid ${isSelected ? "hsl(35,85%,45%)" : "hsl(152,45%,28%)"};cursor:grab;">${stopIcons[stop.type] || "📍"}</div>`,
        className: "custom-marker", iconSize: [36, 36], iconAnchor: [18, 18],
      });
      const marker = L.marker([stop.lat, stop.lng], { icon, draggable: true }).addTo(map).bindPopup(`<strong>${stop.title}</strong><br/><em>${stop.type}</em>`);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onStopDrag?.(stop.id, pos.lat, pos.lng);
      });
      layers.stopMarkers.push(marker);
    });
  }, [stops, selectedStopId, onStopDrag]);

  // Audio zones
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    layers.audioMarkers.forEach((m) => map.removeLayer(m));
    layers.audioMarkers = [];

    audioZones.forEach((zone) => {
      const isSelected = zone.id === selectedAudioId;
      const estDistance = estimateAudioDistance(zone.text);
      const startIcon = L.divIcon({
        html: `<div style="background:${isSelected ? "hsl(35,85%,55%)" : "hsl(280,60%,55%)"};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;cursor:grab;">🔊</div>`,
        className: "custom-marker", iconSize: [28, 28], iconAnchor: [14, 14],
      });
      const startMarker = L.marker([zone.lat, zone.lng], { icon: startIcon, draggable: true }).addTo(map);
      startMarker.bindTooltip(zone.text ? zone.text.substring(0, 30) + "..." : "Zone audio", { direction: "top", offset: [0, -16] });
      startMarker.on("dragend", () => {
        const pos = startMarker.getLatLng();
        onAudioDrag?.(zone.id, pos.lat, pos.lng);
      });
      layers.audioMarkers.push(startMarker);

      if (route.length > 1 && zone.text.trim()) {
        const closest = findClosestRoutePoint(route, zone.lat, zone.lng);
        const endPoint = getPointAtDistance(route, closest.index, estDistance);
        if (endPoint) {
          const segmentPoints: [number, number][] = [[zone.lat, zone.lng]];
          let remaining = estDistance;
          for (let i = closest.index; i < route.length - 1; i++) {
            const dlat = route[i + 1][0] - route[i][0];
            const dlng = route[i + 1][1] - route[i][1];
            const segDist = Math.sqrt(dlat * dlat + dlng * dlng) * 111320;
            if (remaining <= segDist) {
              const ratio = remaining / segDist;
              segmentPoints.push([route[i][0] + dlat * ratio, route[i][1] + dlng * ratio]);
              break;
            }
            segmentPoints.push(route[i + 1]);
            remaining -= segDist;
          }
          const audioLine = L.polyline(segmentPoints, { color: isSelected ? "hsl(35, 85%, 55%)" : "hsl(280, 60%, 55%)", weight: 8, opacity: 0.4, smoothFactor: 1, lineCap: "round" }).addTo(map);
          layers.audioMarkers.push(audioLine);
          const endIcon = L.divIcon({
            html: `<div style="background:${isSelected ? "hsl(35,85%,45%)" : "hsl(280,50%,45%)"};color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;box-shadow:0 2px 4px rgba(0,0,0,0.2);border:2px solid white;opacity:0.7;">⏹</div>`,
            className: "custom-marker", iconSize: [20, 20], iconAnchor: [10, 10],
          });
          const endMarker = L.marker(endPoint, { icon: endIcon }).addTo(map);
          endMarker.bindTooltip(`Fin audio (~${estDistance}m)`, { direction: "top", offset: [0, -12] });
          layers.audioMarkers.push(endMarker);
        }
      }
    });
  }, [audioZones, selectedAudioId, route, onAudioDrag]);

  // Music segments
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    layers.musicMarkers.forEach((m) => map.removeLayer(m));
    layers.musicLines.forEach((l) => map.removeLayer(l));
    layers.musicMarkers = [];
    layers.musicLines = [];

    musicSegments.forEach((seg) => {
      const isSelected = seg.id === selectedMusicId;
      const makeIcon = (label: string) => L.divIcon({
        html: `<div style="background:${isSelected ? "hsl(35,85%,55%)" : "hsl(280,60%,55%)"};color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;cursor:grab;">♫${label}</div>`,
        className: "custom-marker", iconSize: [24, 24], iconAnchor: [12, 12],
      });
      const mA = L.marker([seg.startLat, seg.startLng], { icon: makeIcon("A"), draggable: true }).addTo(map);
      mA.bindTooltip(`🎵 ${seg.trackName} — début`, { direction: "top", offset: [0, -14] });
      mA.on("dragend", () => { const pos = mA.getLatLng(); onMusicDrag?.(seg.id, "start", pos.lat, pos.lng); });
      const mB = L.marker([seg.endLat, seg.endLng], { icon: makeIcon("B"), draggable: true }).addTo(map);
      mB.bindTooltip(`🎵 ${seg.trackName} — fin`, { direction: "top", offset: [0, -14] });
      mB.on("dragend", () => { const pos = mB.getLatLng(); onMusicDrag?.(seg.id, "end", pos.lat, pos.lng); });
      layers.musicMarkers.push(mA, mB);

      if (route.length > 1) {
        const closestA = findClosestRoutePoint(route, seg.startLat, seg.startLng);
        const closestB = findClosestRoutePoint(route, seg.endLat, seg.endLng);
        const startIdx = Math.min(closestA.index, closestB.index);
        const endIdx = Math.max(closestA.index, closestB.index);
        const segRoute = route.slice(startIdx, endIdx + 1);
        if (segRoute.length > 1) {
          const line = L.polyline(segRoute, { color: isSelected ? "hsl(35, 85%, 55%)" : "hsl(280, 60%, 55%)", weight: 8, opacity: 0.3, smoothFactor: 1, lineCap: "round" }).addTo(map);
          layers.musicLines.push(line);
        }
      }
    });
  }, [musicSegments, selectedMusicId, route, onMusicDrag]);

  // Sound segments (green/teal color to differentiate)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    layers.soundMarkers.forEach((m) => map.removeLayer(m));
    layers.soundLines.forEach((l) => map.removeLayer(l));
    layers.soundMarkers = [];
    layers.soundLines = [];

    soundSegments.forEach((seg) => {
      const isSelected = seg.id === selectedSoundId;
      const soundInfo = AMBIENT_SOUNDS.find(s => s.type === seg.soundType);
      const emoji = soundInfo?.emoji || "🔈";

      const makeIcon = (label: string) => L.divIcon({
        html: `<div style="background:${isSelected ? "hsl(35,85%,55%)" : "hsl(170,60%,40%)"};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;line-height:1;">${emoji}</div>`,
        className: "custom-marker", iconSize: [32, 32], iconAnchor: [16, 16],
      });

      const mA = L.marker([seg.startLat, seg.startLng], { icon: makeIcon("A") }).addTo(map);
      mA.bindTooltip(`${emoji} ${soundInfo?.label || seg.soundType} — début`, { direction: "top", offset: [0, -14] });
      const mB = L.marker([seg.endLat, seg.endLng], { icon: makeIcon("B") }).addTo(map);
      mB.bindTooltip(`${emoji} ${soundInfo?.label || seg.soundType} — fin`, { direction: "top", offset: [0, -14] });
      layers.soundMarkers.push(mA, mB);

      if (route.length > 1) {
        const closestA = findClosestRoutePoint(route, seg.startLat, seg.startLng);
        const closestB = findClosestRoutePoint(route, seg.endLat, seg.endLng);
        const startIdx = Math.min(closestA.index, closestB.index);
        const endIdx = Math.max(closestA.index, closestB.index);
        const segRoute = route.slice(startIdx, endIdx + 1);
        if (segRoute.length > 1) {
          const line = L.polyline(segRoute, { color: isSelected ? "hsl(35, 85%, 55%)" : "hsl(170, 60%, 40%)", weight: 8, opacity: 0.3, smoothFactor: 1, lineCap: "round", dashArray: "10 6" }).addTo(map);
          layers.soundLines.push(line);
        }
      }
    });
  }, [soundSegments, selectedSoundId, route]);

  // Music placing start marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    if (layers.musicPlacingMarker) { map.removeLayer(layers.musicPlacingMarker); layers.musicPlacingMarker = null; }
    if (musicPlacingStart) {
      const icon = L.divIcon({
        html: `<div style="background:hsl(280,60%,55%);color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px dashed white;animation:pulse 1.5s infinite;">♫A</div>`,
        className: "custom-marker", iconSize: [28, 28], iconAnchor: [14, 14],
      });
      layers.musicPlacingMarker = L.marker([musicPlacingStart.lat, musicPlacingStart.lng], { icon }).addTo(map);
    }
  }, [musicPlacingStart]);

  // Sound placing start marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    if (layers.soundPlacingMarker) { map.removeLayer(layers.soundPlacingMarker); layers.soundPlacingMarker = null; }
    if (soundPlacingStart) {
      const icon = L.divIcon({
        html: `<div style="background:hsl(170,60%,40%);color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px dashed white;animation:pulse 1.5s infinite;">🔈A</div>`,
        className: "custom-marker", iconSize: [28, 28], iconAnchor: [14, 14],
      });
      layers.soundPlacingMarker = L.marker([soundPlacingStart.lat, soundPlacingStart.lng], { icon }).addTo(map);
    }
  }, [soundPlacingStart]);

  return (
    <div className="absolute inset-0">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Search bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Rechercher une ville, rue…"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-card/95 backdrop-blur-sm text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-elevated"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {showResults && (
          <div className="mt-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-elevated overflow-hidden">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => selectPlace(r.lat, r.lon)}
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors truncate"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {routeLoading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg shadow-elevated px-4 py-2 flex items-center gap-2 border border-border">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Calcul de l'itinéraire…</span>
        </div>
      )}
    </div>
  );
};

export default CircuitEditorMap;
