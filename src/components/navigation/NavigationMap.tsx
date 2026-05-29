import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Locate } from "lucide-react";
import FixedUserArrow from "@/components/navigation/FixedUserArrow";
import {
  DEFAULT_MAP_STYLE,
  TRACKING_ANCHOR_Y,
  computeBounds,
  emptyLineGeoJSON,
  getTrackingZoom,
  paddingForAnchor,
  routeToLineGeoJSON,
} from "@/lib/mapLibreConfig";
import { findClosestRouteIndex, snapPositionToRoute } from "@/lib/navigationMap";

interface Stop {
  id: string;
  title: string;
  lat: number;
  lng: number;
  type: string;
}

interface Participant {
  id: string;
  display_name: string | null;
  lat: number;
  lng: number;
}

interface NavigationMapProps {
  route: [number, number][];
  stops: Stop[];
  userPos: [number, number] | null;
  heading: number;
  currentStopIndex: number;
  participants?: Participant[];
  routeToStart?: [number, number][] | null;
  recalculatedRoute?: [number, number][] | null;
  annotations?: { id: string; lat: number; lng: number; image_url: string | null; caption: string | null; size: string }[];
}

const poiEmoji: Record<string, string> = {
  viewpoint: "👁️",
  restaurant: "🍽️",
  parking: "🅿️",
  site: "🏛️",
};

const ROUTE_COLOR = "#F25C1C";

const NavigationMap = ({
  route,
  stops,
  userPos,
  heading,
  currentStopIndex,
  participants = [],
  routeToStart,
  recalculatedRoute,
  annotations = [],
}: NavigationMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tracking, setTracking] = useState(true);
  const userInteractingRef = useRef(false);
  const hasFitInitialBoundsRef = useRef(false);

  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const participantMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const annotationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const startFlagRef = useRef<maplibregl.Marker | null>(null);

  const mapHeading = useMemo(() => (Number.isFinite(heading) ? heading : 0), [heading]);

  const handleRecenter = useCallback(() => {
    userInteractingRef.current = false;
    setTracking(true);
  }, []);

  // -------- Init map --------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: [2.35, 48.85],
      zoom: 13,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      // Disable rotation gestures so the user can't fight our programmatic bearing
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    map.on("load", () => {
      // Empty sources for dynamic data
      map.addSource("route-full", { type: "geojson", data: emptyLineGeoJSON() });
      map.addSource("route-remaining", { type: "geojson", data: emptyLineGeoJSON() });
      map.addSource("route-traveled", { type: "geojson", data: emptyLineGeoJSON() });
      map.addSource("route-to-start", { type: "geojson", data: emptyLineGeoJSON() });
      map.addSource("route-recalc", { type: "geojson", data: emptyLineGeoJSON() });

      // Base glow halo behind the route
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route-full",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_COLOR, "line-width": 18, "line-opacity": 0.15 },
      });
      // Traveled portion (dimmed)
      map.addLayer({
        id: "route-traveled-line",
        type: "line",
        source: "route-traveled",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_COLOR, "line-width": 7, "line-opacity": 0.5 },
      });
      // Remaining portion (bright)
      map.addLayer({
        id: "route-remaining-line",
        type: "line",
        source: "route-remaining",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_COLOR, "line-width": 7, "line-opacity": 0.9 },
      });
      // Route to start (dashed) — glow + line
      map.addLayer({
        id: "route-to-start-glow",
        type: "line",
        source: "route-to-start",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_COLOR, "line-width": 16, "line-opacity": 0.15 },
      });
      map.addLayer({
        id: "route-to-start-line",
        type: "line",
        source: "route-to-start",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ROUTE_COLOR,
          "line-width": 6,
          "line-opacity": 0.9,
          "line-dasharray": [2, 1.2],
        },
      });
      // Recalculated route (dashed)
      map.addLayer({
        id: "route-recalc-glow",
        type: "line",
        source: "route-recalc",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_COLOR, "line-width": 14, "line-opacity": 0.2 },
      });
      map.addLayer({
        id: "route-recalc-line",
        type: "line",
        source: "route-recalc",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ROUTE_COLOR,
          "line-width": 5,
          "line-opacity": 0.9,
          "line-dasharray": [2, 1.2],
        },
      });

      setMapReady(true);
    });

    // User interaction → drop tracking
    const onDragStart = () => {
      userInteractingRef.current = true;
      setTracking(false);
    };
    map.on("dragstart", onDragStart);
    map.on("touchmove", onDragStart);
    map.getContainer().addEventListener(
      "wheel",
      () => {
        userInteractingRef.current = true;
        setTracking(false);
      },
      { passive: true }
    );

    mapRef.current = map;

    return () => {
      stopMarkersRef.current = [];
      participantMarkersRef.current.clear();
      annotationMarkersRef.current = [];
      userMarkerRef.current = null;
      startFlagRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      hasFitInitialBoundsRef.current = false;
    };
  }, []);

  // -------- Route geometry --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const fullSrc = map.getSource("route-full") as maplibregl.GeoJSONSource | undefined;
    const remainingSrc = map.getSource("route-remaining") as maplibregl.GeoJSONSource | undefined;
    const traveledSrc = map.getSource("route-traveled") as maplibregl.GeoJSONSource | undefined;

    if (route.length === 0) {
      fullSrc?.setData(emptyLineGeoJSON());
      remainingSrc?.setData(emptyLineGeoJSON());
      traveledSrc?.setData(emptyLineGeoJSON());
      return;
    }

    fullSrc?.setData(routeToLineGeoJSON(route));
    remainingSrc?.setData(routeToLineGeoJSON(route));
    traveledSrc?.setData(emptyLineGeoJSON());

    // Start flag marker
    if (startFlagRef.current) {
      startFlagRef.current.remove();
      startFlagRef.current = null;
    }
    const flagEl = document.createElement("div");
    flagEl.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:${ROUTE_COLOR};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 12px rgba(242,92,28,0.5);">🏁</div>`;
    startFlagRef.current = new maplibregl.Marker({ element: flagEl })
      .setLngLat([route[0][1], route[0][0]])
      .addTo(map);

    if (!hasFitInitialBoundsRef.current) {
      const bounds = computeBounds(route);
      if (bounds) {
        map.fitBounds(bounds, { padding: 80, animate: false });
      }
      hasFitInitialBoundsRef.current = true;
    }
  }, [route, mapReady]);

  // -------- Stop markers --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    stops.forEach((stop, i) => {
      const el = document.createElement("div");
      const highlight = i === currentStopIndex;
      el.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:white;border:2.5px solid hsl(15,85%,55%);display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 12px rgba(234,88,12,${highlight ? "0.4" : "0.15"});">${poiEmoji[stop.type] || "📍"}</div>`;
      el.title = stop.title;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);
      stopMarkersRef.current.push(marker);
    });
  }, [stops, mapReady, currentStopIndex]);

  // -------- Participants --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentIds = new Set(participants.map((p) => p.id));
    participantMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        participantMarkersRef.current.delete(id);
      }
    });

    participants.forEach((p) => {
      const existing = participantMarkersRef.current.get(p.id);
      if (existing) {
        existing.setLngLat([p.lng, p.lat]);
      } else {
        const el = document.createElement("div");
        el.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:${ROUTE_COLOR};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${(p.display_name || "?")[0].toUpperCase()}</div>`;
        const marker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
        participantMarkersRef.current.set(p.id, marker);
      }
    });
  }, [participants, mapReady]);

  // -------- Route to start --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("route-to-start") as maplibregl.GeoJSONSource | undefined;
    if (routeToStart && routeToStart.length > 1) {
      src?.setData(routeToLineGeoJSON(routeToStart));
      if (!userPos) {
        const bounds = computeBounds(routeToStart);
        if (bounds) map.fitBounds(bounds, { padding: 80, animate: false });
      }
    } else {
      src?.setData(emptyLineGeoJSON());
    }
  }, [routeToStart, userPos, mapReady]);

  // -------- Recalculated route --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("route-recalc") as maplibregl.GeoJSONSource | undefined;
    if (recalculatedRoute && recalculatedRoute.length > 1) {
      src?.setData(routeToLineGeoJSON(recalculatedRoute));
    } else {
      src?.setData(emptyLineGeoJSON());
    }
  }, [recalculatedRoute, mapReady]);

  // -------- Annotations --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    annotationMarkersRef.current.forEach((m) => m.remove());
    annotationMarkersRef.current = [];

    annotations.forEach((ann) => {
      const sizeMap: Record<string, number> = { small: 36, medium: 52, large: 72 };
      const px = sizeMap[ann.size] || 52;
      const hasImage = !!ann.image_url;
      const el = document.createElement("div");
      el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;">
        <div style="width:${px}px;height:${px}px;border-radius:12px;border:2.5px solid hsl(15,85%,55%);overflow:hidden;background:white;box-shadow:0 3px 16px rgba(234,88,12,0.3);display:flex;align-items:center;justify-content:center;">
          ${hasImage ? `<img src="${ann.image_url}" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="font-size:${px * 0.4}px;">🖼</span>`}
        </div>
        ${ann.caption ? `<div style="max-width:${px + 60}px;background:white;border-radius:8px;padding:3px 8px;font-family:'DM Sans',system-ui,sans-serif;font-size:12px;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,0.12);color:#1a1a1a;">${ann.caption}</div>` : ""}
      </div>`;
      // rotationAlignment 'viewport' keeps the marker screen-aligned regardless of map bearing
      const marker = new maplibregl.Marker({ element: el, rotationAlignment: "viewport" })
        .setLngLat([ann.lng, ann.lat])
        .addTo(map);
      annotationMarkersRef.current.push(marker);
    });
  }, [annotations, mapReady]);

  // -------- User position, snap-to-route, traveled split, camera tracking --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !userPos) return;

    // Snap to route within 45 m
    let displayPos: [number, number] = userPos;
    let snappedSegIdx: number | null = null;
    if (route.length > 1) {
      const snap = snapPositionToRoute(route, userPos);
      if (snap && snap.lateralDistanceM < 45) {
        displayPos = [snap.lat, snap.lng];
        snappedSegIdx = snap.segmentIndex;
      }
    }

    // Update traveled/remaining split
    if (route.length > 1) {
      const remainingSrc = map.getSource("route-remaining") as maplibregl.GeoJSONSource | undefined;
      const traveledSrc = map.getSource("route-traveled") as maplibregl.GeoJSONSource | undefined;

      if (routeToStart && routeToStart.length > 1) {
        traveledSrc?.setData(emptyLineGeoJSON());
        remainingSrc?.setData(routeToLineGeoJSON(route));
      } else {
        const splitIdx = snappedSegIdx !== null ? snappedSegIdx : findClosestRouteIndex(route, userPos);
        const traveled = route.slice(0, splitIdx + 1).concat([displayPos]);
        const remaining = [displayPos].concat(route.slice(splitIdx + 1));
        traveledSrc?.setData(routeToLineGeoJSON(traveled));
        remainingSrc?.setData(routeToLineGeoJSON(remaining));
      }
    }

    // User position marker (hidden while tracking, visible when user panned)
    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "ml-user-marker";
      el.innerHTML = `
        <div class="waze-arrow-shell">
          <div class="waze-arrow-icon">
            <svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true">
              <polygon points="24,4 9,40 24,32 39,40" fill="${ROUTE_COLOR}" stroke="white" stroke-width="3" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>`;
      userMarkerRef.current = new maplibregl.Marker({
        element: el,
        rotationAlignment: "map",
      })
        .setLngLat([displayPos[1], displayPos[0]])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([displayPos[1], displayPos[0]]);
    }
    userMarkerRef.current.setRotation(mapHeading);
    const userEl = userMarkerRef.current.getElement();
    userEl.style.opacity = tracking ? "0" : "1";

    if (tracking) {
      userInteractingRef.current = false;
      const size = map.getCanvas();
      const padding = paddingForAnchor(size.height / (window.devicePixelRatio || 1), TRACKING_ANCHOR_Y);
      const targetZoom = getTrackingZoom(size.width / (window.devicePixelRatio || 1), map.getZoom());

      map.easeTo({
        center: [displayPos[1], displayPos[0]],
        zoom: targetZoom,
        bearing: mapHeading,
        pitch: 0,
        padding,
        duration: 600,
        essential: true,
      });
    }
  }, [userPos, mapHeading, route, tracking, routeToStart, mapReady]);

  return (
    <>
      <style>{`
        .nav-map-shell {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: hsl(var(--background));
          position: relative;
        }
        .nav-map-canvas {
          width: 100%;
          height: 100%;
        }
        .ml-user-marker {
          transition: opacity 200ms ease;
        }
        .waze-arrow-shell {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .waze-arrow-shell-lg {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .waze-arrow-icon,
        .waze-arrow-icon-lg {
          transform-origin: center center;
        }
        .waze-arrow-icon-lg {
          filter: drop-shadow(0 3px 8px rgba(255,149,0,0.35));
        }
        .maplibregl-canvas {
          outline: none;
        }
      `}</style>
      <div className="nav-map-shell">
        <div ref={containerRef} className="nav-map-canvas" />
        <FixedUserArrow
          anchorY={TRACKING_ANCHOR_Y}
          bearing={mapHeading}
          visible={tracking && !!userPos && mapReady}
        />
        {!tracking && userPos && (
          <button
            onClick={handleRecenter}
            className="absolute bottom-6 right-4 z-[1100] flex items-center gap-2 px-4 py-3 rounded-full bg-card/95 backdrop-blur-xl border border-primary/15 shadow-elevated transition-all active:scale-95 hover:shadow-glow"
          >
            <Locate className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Recentrer</span>
          </button>
        )}
      </div>
    </>
  );
};

export default NavigationMap;
