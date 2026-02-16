import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { StopData, AudioZoneData, EditorMode } from "@/pages/CircuitCreator";

interface CircuitEditorMapProps {
  route: [number, number][];
  stops: StopData[];
  audioZones: AudioZoneData[];
  mode: EditorMode;
  onMapClick: (lat: number, lng: number) => void;
  selectedStopId: string | null;
  selectedAudioId: string | null;
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
  select: "default",
};

const CircuitEditorMap = ({
  route,
  stops,
  audioZones,
  mode,
  onMapClick,
  selectedStopId,
  selectedAudioId,
}: CircuitEditorMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    polyline: L.Polyline | null;
    routeMarkers: L.CircleMarker[];
    stopMarkers: L.Marker[];
    audioCircles: L.Circle[];
  }>({ polyline: null, routeMarkers: [], stopMarkers: [], audioCircles: [] });

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [46.8, 2.3],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Click handler
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);

  // Cursor
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.style.cursor = cursorByMode[mode];
  }, [mode]);

  // Draw route
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const layers = layersRef.current;

    // Clear old
    if (layers.polyline) map.removeLayer(layers.polyline);
    layers.routeMarkers.forEach((m) => map.removeLayer(m));
    layers.routeMarkers = [];

    if (route.length > 0) {
      layers.polyline = L.polyline(route, {
        color: "hsl(152, 45%, 28%)",
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      route.forEach((point, i) => {
        const isLast = i === route.length - 1;
        const marker = L.circleMarker(point, {
          radius: isLast ? 7 : 4,
          color: isLast ? "hsl(35, 85%, 55%)" : "hsl(152, 45%, 28%)",
          fillColor: isLast ? "hsl(35, 85%, 55%)" : "hsl(152, 45%, 28%)",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
        layers.routeMarkers.push(marker);
      });
    }
  }, [route]);

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

  return <div ref={mapRef} className="absolute inset-0" />;
};

export default CircuitEditorMap;
