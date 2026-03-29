import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
}

const poiEmoji: Record<string, string> = {
  viewpoint: "👁️",
  restaurant: "🍽️",
  parking: "🅿️",
  site: "🏛️",
};

function findClosestRouteIndex(route: [number, number][], pos: [number, number]): number {
  let minDist = Infinity;
  let idx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = (route[i][0] - pos[0]) ** 2 + (route[i][1] - pos[1]) ** 2;
    if (d < minDist) { minDist = d; idx = i; }
  }
  return idx;
}

/** Compute bearing from route at the user's position (direction of travel along route) */
function getRouteBearing(route: [number, number][], pos: [number, number]): number {
  const idx = findClosestRouteIndex(route, pos);
  // Look ahead a few points for smoother bearing
  const lookAhead = Math.min(idx + 5, route.length - 1);
  const from = route[idx];
  const to = route[lookAhead];
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

const NavigationMap = ({
  route,
  stops,
  userPos,
  heading,
  currentStopIndex,
  participants = [],
}: NavigationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const participantMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const traveledLineRef = useRef<L.Polyline | null>(null);
  const remainingLineRef = useRef<L.Polyline | null>(null);

  // Compute route-based bearing so arrow always points along the road
  const routeBearing = useMemo(() => {
    if (!userPos || route.length < 2) return 0;
    return getRouteBearing(route, userPos);
  }, [userPos, route]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    // Clean map style like Waze
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    // Draw route
    if (route.length > 0) {
      // Route shadow
      L.polyline(route, {
        color: "#4A66F4",
        weight: 16,
        opacity: 0.2,
        smoothFactor: 1,
      }).addTo(map);

      // Remaining route (blue like Waze)
      remainingLineRef.current = L.polyline(route, {
        color: "#4A66F4",
        weight: 8,
        opacity: 0.9,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Traveled route (darker)
      traveledLineRef.current = L.polyline([], {
        color: "#8B9DC3",
        weight: 8,
        opacity: 0.6,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      const polyline = L.polyline(route);
      map.fitBounds(polyline.getBounds(), { padding: [80, 80] });
    }

    // POI markers
    stops.forEach((stop) => {
      const icon = L.divIcon({
        html: `
          <div style="
            width:36px;height:36px;
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="
              width:32px;height:32px;border-radius:50%;
              background:white;
              border:2px solid #4A66F4;
              display:flex;align-items:center;justify-content:center;
              font-size:14px;
              box-shadow:0 2px 8px rgba(0,0,0,0.2);
            ">${poiEmoji[stop.type] || "📍"}</div>
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

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      stopMarkersRef.current = [];
      participantMarkersRef.current.clear();
      traveledLineRef.current = null;
      remainingLineRef.current = null;
    };
  }, [route, stops]);

  // Update participant markers
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    const currentIds = new Set(participants.map(p => p.id));

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
            <div style="
              width:32px;height:32px;border-radius:50%;
              background:#FF9500;border:3px solid white;
              display:flex;align-items:center;justify-content:center;
              font-size:12px;color:white;font-weight:bold;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
            ">${(p.display_name || "?")[0].toUpperCase()}</div>
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

  // Update user position + rotate map so route is always "up"
  useEffect(() => {
    if (!mapInstance.current || !userPos) return;
    const map = mapInstance.current;

    // Update traveled/remaining polylines
    if (route.length > 1) {
      const closestIdx = findClosestRouteIndex(route, userPos);
      const traveled = route.slice(0, closestIdx + 1).concat([userPos]);
      const remaining = [userPos].concat(route.slice(closestIdx + 1));
      if (traveledLineRef.current) traveledLineRef.current.setLatLngs(traveled);
      if (remainingLineRef.current) remainingLineRef.current.setLatLngs(remaining);
    }

    // Create or update user marker (Waze-style chevron)
    if (!userMarkerRef.current) {
      const icon = L.divIcon({
        html: `
          <div class="waze-arrow-container">
            <div class="waze-arrow-pulse"></div>
            <div class="waze-arrow-icon">
              <svg viewBox="0 0 40 40" width="40" height="40">
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

    // Rotate map so route direction = up. The map rotates by -routeBearing
    // so the arrow always points "up" on screen.
    const mapContainer = map.getContainer();
    mapContainer.style.transition = "transform 0.6s ease-out";
    mapContainer.style.transformOrigin = "center 70%";
    // Scale up to fill the perspective-cropped area, rotate to heading-up
    mapContainer.style.transform = `rotate(${-routeBearing}deg) scale(1.5)`;

    // Position user at ~70% down the viewport
    // First set view to user pos, then offset
    const targetZoom = Math.max(map.getZoom(), 16);
    map.setView(userPos, targetZoom, { animate: false });

    // Now offset: move the center UP so user appears at 70% down
    const mapSize = map.getSize();
    const offsetY = mapSize.y * 0.25; // push center up by 25% → user at ~70% down
    const point = map.latLngToContainerPoint(userPos);
    const newCenter = map.containerPointToLatLng(L.point(point.x, point.y - offsetY));
    map.setView(newCenter, targetZoom, { animate: true, duration: 0.5 });

  }, [userPos, routeBearing, route]);

  // Highlight current stop
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
        .waze-user-marker {
          background: none !important;
          border: none !important;
        }
        .waze-arrow-container {
          width: 56px; height: 56px;
          position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .waze-arrow-pulse {
          position: absolute;
          width: 56px; height: 56px;
          border-radius: 50%;
          background: rgba(74, 102, 244, 0.2);
          animation: waze-pulse 2s ease-out infinite;
        }
        .waze-arrow-icon {
          position: relative;
          z-index: 2;
        }
        .poi-marker {
          background: none !important;
          border: none !important;
        }
        .participant-marker {
          background: none !important;
          border: none !important;
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
        .nav-map-perspective {
          width: 100%;
          height: 100%;
          overflow: hidden;
          perspective: 600px;
        }
        .nav-map-tilted {
          width: 100%;
          height: 100%;
          transform: rotateX(35deg);
          transform-origin: center 70%;
        }
      `}</style>
      <div className="nav-map-perspective">
        <div ref={mapRef} className="nav-map-tilted" />
      </div>
    </>
  );
};

export default NavigationMap;
