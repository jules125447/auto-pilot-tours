import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RouteMapProps {
  route: [number, number][];
  stops?: { lat: number; lng: number; title: string; type: string }[];
  className?: string;
  interactive?: boolean;
}

const stopIcons: Record<string, string> = {
  viewpoint: "👁️",
  restaurant: "🍽️",
  parking: "🅿️",
  site: "🏛️",
};

const RouteMap = ({ route, stops = [], className = "", interactive = true }: RouteMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
      attributionControl: false,
    });

    L.tileLayer("https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg", {
      maxZoom: 18,
    }).addTo(map);

    // Subtle label overlay for readability
    L.tileLayer("https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      opacity: 0.4,
    }).addTo(map);

    if (route.length > 0) {
      const polyline = L.polyline(route, {
        color: "hsl(152, 45%, 28%)",
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }

    stops.forEach((stop) => {
      const icon = L.divIcon({
        html: `<div style="background:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:16px;">${stopIcons[stop.type] || "📍"}</div>`,
        className: "custom-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${stop.title}</strong>`);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [route, stops, interactive]);

  return <div ref={mapRef} className={`w-full ${className}`} />;
};

export default RouteMap;
