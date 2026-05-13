import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

interface Ping {
  lat: number;
  lng: number;
  speed_kmh?: number | null;
}

export default function GpsHeatmap({ pings }: { pings: Ping[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [46.6, 2.4],
        zoom: 6,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap, © CartoDB",
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    if (heatRef.current) {
      mapRef.current.removeLayer(heatRef.current);
    }

    const points = pings
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => [p.lat, p.lng, 0.5] as [number, number, number]);

    if (points.length > 0) {
      heatRef.current = (L as any).heatLayer(points, {
        radius: 18,
        blur: 22,
        maxZoom: 17,
        gradient: { 0.2: "#fde68a", 0.4: "#fdba74", 0.6: "#f97316", 0.8: "#ea580c", 1.0: "#7c2d12" },
      }).addTo(mapRef.current);

      const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [pings]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-[500px] rounded-xl overflow-hidden border border-border" />;
}
