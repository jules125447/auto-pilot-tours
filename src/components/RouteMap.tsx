import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_MAP_STYLE,
  computeBounds,
  routeToLineGeoJSON,
} from "@/lib/mapLibreConfig";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: route.length > 0 ? [route[0][1], route[0][0]] : [2.35, 48.85],
      zoom: 12,
      attributionControl: false,
      interactive,
    });

    map.on("load", () => {
      // Route polyline
      if (route.length > 0) {
        map.addSource("route", {
          type: "geojson",
          data: routeToLineGeoJSON(route),
        });
        map.addLayer({
          id: "route-glow",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "hsl(152, 45%, 28%)",
            "line-width": 10,
            "line-opacity": 0.15,
          },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "hsl(152, 45%, 28%)",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });

        const bounds = computeBounds(route);
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, animate: false });
        }
      }

      // POI markers
      stops.forEach((stop) => {
        const el = document.createElement("div");
        el.style.cssText =
          "background:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:16px;";
        el.textContent = stopIcons[stop.type] || "📍";

        new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${stop.title}</strong>`))
          .addTo(map);
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={`w-full ${className}`} />;
};

export default RouteMap;
