import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate } from "lucide-react";
import FixedUserArrow from "@/components/navigation/FixedUserArrow";
import {
  MAP_TILE_SOURCES,
  centerMapOnAnchoredPoint,
  createBaseTileLayer,
  findClosestRouteIndex,
  getRouteBearing,
  getTrackingAnchorY,
  getTrackingZoom,
} from "@/lib/navigationMap";

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
}

const poiEmoji: Record<string, string> = {
  viewpoint: "👁️",
  restaurant: "🍽️",
  parking: "🅿️",
  site: "🏛️",
};

const NavigationMap = ({
  route,
  stops,
  userPos,
  heading,
  currentStopIndex,
  participants = [],
  routeToStart,
}: NavigationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const participantMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const traveledLineRef = useRef<L.Polyline | null>(null);
  const remainingLineRef = useRef<L.Polyline | null>(null);
  const routeToStartLineRef = useRef<L.Polyline | null>(null);
  const routeToStartGlowRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const tileFallbackTimeoutRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [tracking, setTracking] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const userInteractingRef = useRef(false);
  const activeRoute = useMemo(() => {
    if (routeToStart && routeToStart.length > 1) return routeToStart;
    return route;
  }, [route, routeToStart]);

  const routeBearing = useMemo(() => {
    if (!userPos) return heading;
    if (activeRoute.length < 2) return heading;
    return getRouteBearing(activeRoute, userPos) || heading;
  }, [userPos, activeRoute, heading]);

  const syncMapSize = useCallback(() => {
    const map = mapInstance.current;
    if (!map) return;

    const size = map.getSize();
    setMapSize((prev) =>
      prev.width === size.x && prev.height === size.y
        ? prev
        : { width: size.x, height: size.y }
    );
  }, []);

  const trackingAnchorY = useMemo(
    () =>
      getTrackingAnchorY(
        mapSize.width || (typeof window === "undefined" ? 1024 : window.innerWidth),
        mapSize.height || (typeof window === "undefined" ? 768 : window.innerHeight)
      ),
    [mapSize]
  );

  const handleRecenter = useCallback(() => {
    userInteractingRef.current = false;
    setTracking(true);
    mapInstance.current?.invalidateSize({ pan: false });
    syncMapSize();
  }, [syncMapSize]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      preferCanvas: true,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
    });

    const clearTileFallbackTimeout = () => {
      if (tileFallbackTimeoutRef.current !== null) {
        window.clearTimeout(tileFallbackTimeoutRef.current);
        tileFallbackTimeoutRef.current = null;
      }
    };

    const attachTileLayer = (sourceIndex: number) => {
      const tileLayer = createBaseTileLayer(MAP_TILE_SOURCES[sourceIndex]);
      let resolved = false;
      let tileErrors = 0;

      const fallbackToNextSource = () => {
        if (resolved || sourceIndex >= MAP_TILE_SOURCES.length - 1) return;

        resolved = true;
        clearTileFallbackTimeout();
        map.removeLayer(tileLayer);
        tileLayerRef.current = attachTileLayer(sourceIndex + 1);
      };

      tileFallbackTimeoutRef.current = window.setTimeout(() => {
        fallbackToNextSource();
      }, 4500);

      tileLayer.on("tileload", () => {
        if (resolved) return;
        resolved = true;
        clearTileFallbackTimeout();
      });

      tileLayer.on("tileerror", () => {
        tileErrors += 1;
        if (tileErrors < 2) return;
        fallbackToNextSource();
      });

      tileLayer.addTo(map);
      return tileLayer;
    };

    tileLayerRef.current = attachTileLayer(0);

    if (route.length > 0) {
      L.polyline(route, {
        color: "#4A66F4",
        weight: 18,
        opacity: 0.18,
        smoothFactor: 1,
      }).addTo(map);

      remainingLineRef.current = L.polyline(route, {
        color: "#4A66F4",
        weight: 8,
        opacity: 0.92,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      traveledLineRef.current = L.polyline([], {
        color: "#8FA3D9",
        weight: 8,
        opacity: 0.55,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      const polyline = L.polyline(route);
      map.fitBounds(polyline.getBounds(), { padding: [80, 80] });
    }

    // Add flag marker at route start point
    if (route.length > 0) {
      const startIcon = L.divIcon({
        html: `
          <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="width:36px;height:36px;border-radius:50%;background:#FF9500;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 12px rgba(255,149,0,0.5);">🏁</div>
          </div>
        `,
        className: "poi-marker",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      L.marker([route[0][0], route[0][1]], { icon: startIcon, zIndexOffset: 900 }).addTo(map);
    }

    stops.forEach((stop) => {
      const icon = L.divIcon({
        html: `
          <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <div style="width:32px;height:32px;border-radius:50%;background:white;border:2px solid #4A66F4;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">${poiEmoji[stop.type] || "📍"}</div>
          </div>
        `,
        className: "poi-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
      marker.bindTooltip(stop.title, {
        permanent: false,
        direction: "top",
        className: "poi-tooltip-nav",
        offset: [0, -20],
      });
      stopMarkersRef.current.push(marker);
    });

    const invalidateMapSize = () => {
      requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
        syncMapSize();
      });
    };

    map.whenReady(() => {
      invalidateMapSize();
      syncMapSize();
      setMapReady(true);
    });
    window.addEventListener("resize", invalidateMapSize);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver(invalidateMapSize);
      resizeObserverRef.current.observe(mapRef.current);
    }

    // Detect user interaction to break tracking
    const mapContainer = map.getContainer();
    const markUserInteraction = () => {
      userInteractingRef.current = true;
    };
    const onDragStart = () => {
      userInteractingRef.current = true;
      setTracking(false);
    };
    const onMoveStart = () => {
      if (userInteractingRef.current) {
        setTracking(false);
      }
    };

    mapContainer.addEventListener("pointerdown", markUserInteraction, { passive: true });
    mapContainer.addEventListener("wheel", markUserInteraction, { passive: true });
    map.on("dragstart", onDragStart);
    map.on("movestart", onMoveStart);
    map.on("zoomstart", () => {
      if (userInteractingRef.current) {
        setTracking(false);
      }
    });

    mapInstance.current = map;

    return () => {
      mapContainer.removeEventListener("pointerdown", markUserInteraction);
      mapContainer.removeEventListener("wheel", markUserInteraction);
      window.removeEventListener("resize", invalidateMapSize);
      resizeObserverRef.current?.disconnect();
      map.off("dragstart", onDragStart);
      map.off("movestart", onMoveStart);
      clearTileFallbackTimeout();
      tileLayerRef.current = null;
      map.remove();
      mapInstance.current = null;
      stopMarkersRef.current = [];
      participantMarkersRef.current.clear();
      traveledLineRef.current = null;
      remainingLineRef.current = null;
      routeToStartGlowRef.current = null;
      routeToStartLineRef.current = null;
      setMapSize({ width: 0, height: 0 });
      setMapReady(false);
    };
  }, [route, stops, syncMapSize]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    const currentIds = new Set(participants.map((p) => p.id));

    participantMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(marker);
        participantMarkersRef.current.delete(id);
      }
    });

    participants.forEach((p) => {
      const existing = participantMarkersRef.current.get(p.id);
      if (existing) {
        existing.setLatLng([p.lat, p.lng]);
      } else {
        const icon = L.divIcon({
          html: `
            <div style="width:32px;height:32px;border-radius:50%;background:#FF9500;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${(p.display_name || "?")[0].toUpperCase()}</div>
          `,
          className: "participant-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: 500 }).addTo(map);
        participantMarkersRef.current.set(p.id, marker);
      }
    });
  }, [participants]);

  // Draw orange route-to-start polyline
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    if (routeToStartGlowRef.current) {
      map.removeLayer(routeToStartGlowRef.current);
      routeToStartGlowRef.current = null;
    }

    if (routeToStartLineRef.current) {
      map.removeLayer(routeToStartLineRef.current);
      routeToStartLineRef.current = null;
    }

    if (routeToStart && routeToStart.length > 1) {
      routeToStartGlowRef.current = L.polyline(routeToStart, {
        color: "#FF9500",
        weight: 16,
        opacity: 0.15,
        smoothFactor: 1,
      }).addTo(map);

      routeToStartLineRef.current = L.polyline(routeToStart, {
        color: "#FF9500",
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "12 8",
      }).addTo(map);

      if (!userPos) {
        map.fitBounds(routeToStartLineRef.current.getBounds(), { padding: [80, 80] });
      }
    }
  }, [routeToStart, userPos]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    if (!userPos) {
      return;
    }

    if (route.length > 1) {
      if (routeToStart && routeToStart.length > 1) {
        if (traveledLineRef.current) traveledLineRef.current.setLatLngs([]);
        if (remainingLineRef.current) remainingLineRef.current.setLatLngs(route);
      } else {
        const closestIdx = findClosestRouteIndex(route, userPos);
        const traveled = route.slice(0, closestIdx + 1).concat([userPos]);
        const remaining = [userPos].concat(route.slice(closestIdx + 1));

        if (traveledLineRef.current) traveledLineRef.current.setLatLngs(traveled);
        if (remainingLineRef.current) remainingLineRef.current.setLatLngs(remaining);
      }
    }

    if (!userMarkerRef.current) {
      const icon = L.divIcon({
        html: `
          <div class="waze-arrow-shell">
            <div class="waze-arrow-pulse"></div>
            <div class="waze-arrow-icon">
              <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
                <polygon points="20,4 8,32 20,26 32,32" fill="#4A66F4" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        `,
        className: "waze-user-marker",
        iconSize: [56, 56],
        iconAnchor: [28, 28],
      });
      userMarkerRef.current = L.marker(userPos, { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(userPos);
    }

    const markerElement = userMarkerRef.current.getElement();
    // When tracking, the Leaflet marker is hidden (the fixed overlay arrow is shown instead)
    if (markerElement) {
      markerElement.style.opacity = tracking ? "0" : "1";
    }
    // When not tracking, rotate the marker arrow to match bearing
    const arrowIcon = markerElement?.querySelector(".waze-arrow-icon") as HTMLElement | null;
    if (arrowIcon) {
      arrowIcon.style.transform = tracking ? "rotate(0deg)" : `rotate(${routeBearing}deg)`;
    }

    // Rotate the entire map container so the route faces "up" (like Waze/Google Maps)
    const mapContainer = map.getContainer();
    if (tracking) {
      userInteractingRef.current = false;

      // Apply rotation: negative bearing so the direction of travel points up
      mapContainer.style.transformOrigin = "center center";
      mapContainer.style.transition = "transform 0.5s ease-out";
      mapContainer.style.transform = `rotate(${-routeBearing}deg)`;
      // Scale up slightly to hide corners during rotation
      const diagonal = Math.sqrt(mapContainer.offsetWidth ** 2 + mapContainer.offsetHeight ** 2);
      const maxDim = Math.max(mapContainer.offsetWidth, mapContainer.offsetHeight);
      const scale = diagonal / maxDim;
      mapContainer.style.transform = `rotate(${-routeBearing}deg) scale(${scale})`;

      const currentMapSize = map.getSize();
      const anchorY = getTrackingAnchorY(currentMapSize.x, currentMapSize.y);
      const targetZoom = getTrackingZoom(currentMapSize.x, map.getZoom());
      centerMapOnAnchoredPoint(map, userPos, anchorY, targetZoom);
    } else {
      // Reset rotation when user is panning manually
      mapContainer.style.transform = "none";
      mapContainer.style.transition = "none";
    }
  }, [userPos, routeBearing, route, tracking, routeToStart]);

  useEffect(() => {
    stopMarkersRef.current.forEach((marker, i) => {
      const el = marker.getElement();
      if (!el) return;
      const inner = el.querySelector("div[style*='border']") as HTMLElement;
      if (!inner) return;

      if (i === currentStopIndex) {
        inner.style.borderColor = "#FF9500";
        inner.style.boxShadow = "0 2px 12px rgba(255,149,0,0.5)";
      } else {
        inner.style.borderColor = "#4A66F4";
        inner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      }
    });
  }, [currentStopIndex]);

  return (
    <>
      <style>{`
        @keyframes waze-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .waze-user-marker,
        .poi-marker,
        .participant-marker {
          background: none !important;
          border: none !important;
        }
        .waze-arrow-shell {
          width: 56px;
          height: 56px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .waze-arrow-pulse {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(74, 102, 244, 0.2);
          animation: waze-pulse 2s ease-out infinite;
        }
        .waze-arrow-icon {
          position: relative;
          z-index: 2;
          transform-origin: center center;
          transition: transform 0.45s ease-out;
        }
        .poi-tooltip-nav {
          background: white !important;
          color: #333 !important;
          border: 1px solid #ddd !important;
          border-radius: 8px !important;
          padding: 4px 10px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        }
        .poi-tooltip-nav::before {
          border-top-color: white !important;
        }
        .leaflet-container {
          background: hsl(var(--muted));
        }
        .nav-map-shell {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: hsl(var(--muted));
          position: relative;
        }
        .nav-map-canvas {
          width: 100%;
          height: 100%;
          will-change: transform;
        }
      `}</style>
      <div className="nav-map-shell">
        <div ref={mapRef} className="nav-map-canvas" />
        <FixedUserArrow
          anchorY={trackingAnchorY}
          bearing={routeBearing}
          visible={tracking && !!userPos && mapReady}
        />
        {/* Recenter button — shown when user has panned away */}
        {!tracking && userPos && (
          <button
            onClick={handleRecenter}
            className="absolute bottom-6 right-4 z-[1100] flex items-center gap-2 px-4 py-3 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-elevated transition-all active:scale-95 hover:bg-card"
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
