import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { StopData, AudioZoneData, MusicSegmentData, EditorMode } from "@/pages/CircuitCreator";

interface CircuitEditorMapProps {
  route: [number, number][];
  waypoints: [number, number][];
  stops: StopData[];
  audioZones: AudioZoneData[];
  musicSegments: MusicSegmentData[];
  musicPlacingStart: { lat: number; lng: number } | null;
  mode: EditorMode;
  onMapClick: (lat: number, lng: number) => void;
  onWaypointDrag: (index: number, lat: number, lng: number) => void;
  selectedStopId: string | null;
  selectedAudioId: string | null;
  selectedMusicId: string | null;
  routeLoading: boolean;
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
  select: "default",
};

const waypointLabel = (i: number) => String.fromCharCode(65 + i); // A, B, C...

const CircuitEditorMap = ({
  route,
  waypoints,
  stops,
  audioZones,
  musicSegments,
  musicPlacingStart,
  mode,
  onMapClick,
  onWaypointDrag,
  selectedStopId,
  selectedAudioId,
  selectedMusicId,
  routeLoading,
}: CircuitEditorMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    polyline: L.Polyline | null;
    waypointMarkers: L.Marker[];
    stopMarkers: L.Marker[];
    audioCircles: L.Circle[];
    musicMarkers: L.Marker[];
    musicPlacingMarker: L.Marker | null;
  }>({ polyline: null, waypointMarkers: [], stopMarkers: [], audioCircles: [], musicMarkers: [], musicPlacingMarker: null });

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [46.8, 2.3],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Click handler
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onMapClick]);

  // Cursor
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.style.cursor = cursorByMode[mode];
  }, [mode]);

  // Draw route polyline + waypoint markers with A,B,C labels
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;

    if (layers.polyline) map.removeLayer(layers.polyline);
    layers.waypointMarkers.forEach((m) => map.removeLayer(m));
    layers.waypointMarkers = [];

    if (route.length > 1) {
      layers.polyline = L.polyline(route, {
        color: "hsl(152, 45%, 28%)",
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
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
        className: "custom-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker(point, { icon, draggable: true }).addTo(map);
      marker.bindTooltip(
        isFirst ? `Départ (${label})` : isLast ? `Arrivée (${label})` : `Point ${label}`,
        { direction: "top", offset: [0, -16] }
      );
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onWaypointDrag(i, pos.lat, pos.lng);
      });
      layers.waypointMarkers.push(marker);
    });
  }, [route, waypoints, onWaypointDrag]);

  // Draw stops
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    layers.stopMarkers.forEach((m) => map.removeLayer(m));
    layers.stopMarkers = [];

    stops.forEach((stop) => {
      const isSelected = stop.id === selectedStopId;
      const icon = L.divIcon({
        html: `<div style="background:${isSelected ? "hsl(35,85%,55%)" : "white"};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-size:18px;border:2px solid ${isSelected ? "hsl(35,85%,45%)" : "hsl(152,45%,28%)"};">${stopIcons[stop.type] || "📍"}</div>`,
        className: "custom-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const marker = L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${stop.title}</strong><br/><em>${stop.type}</em>`);
      layers.stopMarkers.push(marker);
    });
  }, [stops, selectedStopId]);

  // Draw audio zones
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    layers.audioCircles.forEach((c) => map.removeLayer(c));
    layers.audioCircles = [];

    audioZones.forEach((zone) => {
      const isSelected = zone.id === selectedAudioId;
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: isSelected ? "hsl(35, 85%, 55%)" : "hsl(205, 55%, 45%)",
        fillColor: isSelected ? "hsl(35, 85%, 55%)" : "hsl(205, 55%, 45%)",
        fillOpacity: 0.15,
        weight: 2,
        dashArray: isSelected ? undefined : "6 4",
      }).addTo(map);
      layers.audioCircles.push(circle);
    });
  }, [audioZones, selectedAudioId]);

  // Draw music segment markers (A/B pairs)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    layers.musicMarkers.forEach((m) => map.removeLayer(m));
    layers.musicMarkers = [];

    musicSegments.forEach((seg, idx) => {
      const isSelected = seg.id === selectedMusicId;
      const borderColor = isSelected ? "hsl(35,85%,55%)" : "hsl(280,60%,55%)";

      const makeIcon = (label: string) => L.divIcon({
        html: `<div style="background:${isSelected ? "hsl(35,85%,55%)" : "hsl(280,60%,55%)"};color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">♫${label}</div>`,
        className: "custom-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const mA = L.marker([seg.startLat, seg.startLng], { icon: makeIcon("A") }).addTo(map);
      mA.bindTooltip(`🎵 ${seg.trackName} — début`, { direction: "top", offset: [0, -14] });
      const mB = L.marker([seg.endLat, seg.endLng], { icon: makeIcon("B") }).addTo(map);
      mB.bindTooltip(`🎵 ${seg.trackName} — fin`, { direction: "top", offset: [0, -14] });
      layers.musicMarkers.push(mA, mB);
    });
  }, [musicSegments, selectedMusicId]);

  // Draw music placing start marker
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const layers = layersRef.current;
    if (layers.musicPlacingMarker) { map.removeLayer(layers.musicPlacingMarker); layers.musicPlacingMarker = null; }

    if (musicPlacingStart) {
      const icon = L.divIcon({
        html: `<div style="background:hsl(280,60%,55%);color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px dashed white;animation:pulse 1.5s infinite;">♫A</div>`,
        className: "custom-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      layers.musicPlacingMarker = L.marker([musicPlacingStart.lat, musicPlacingStart.lng], { icon }).addTo(map);
    }
  }, [musicPlacingStart]);

  return (
    <div className="absolute inset-0">
      <div ref={mapRef} className="absolute inset-0" />
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
