import { useEffect, useRef } from "react";
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

// Offset a lat/lng by pixels on screen, used to position user at bottom-center
function offsetLatLng(map: L.Map, latlng: [number, number], pixelOffsetY: number): L.LatLng {
  const point = map.latLngToContainerPoint(latlng);
  const offsetPoint = L.point(point.x, point.y - pixelOffsetY);
  return map.containerPointToLatLng(offsetPoint);
}

const NavigationMap = ({
  route,
  stops,
  userPos,
  heading,
  currentStopIndex,
  participants = [],
}: NavigationMapProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const participantMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const traveledLineRef = useRef<L.Polyline | null>(null);
  const remainingLineRef = useRef<L.Polyline | null>(null);
  const labelsPaneRef = useRef<HTMLElement | null>(null);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    // Base tiles (no labels)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    // Labels-only layer in its own pane for counter-rotation
    const labelsPane = map.createPane("labelsPane");
    labelsPane.style.zIndex = "450";
    labelsPaneRef.current = labelsPane;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, pane: "labelsPane" }
    ).addTo(map);

    // Draw route
    if (route.length > 0) {
      // Shadow
      L.polyline(route, {
        color: "hsl(205, 60%, 48%)",
        weight: 14,
        opacity: 0.15,
        smoothFactor: 1,
      }).addTo(map);

      // Remaining (full route initially)
      remainingLineRef.current = L.polyline(route, {
        color: "hsl(205, 60%, 48%)",
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Traveled (empty initially)
      traveledLineRef.current = L.polyline([], {
        color: "hsl(35, 85%, 55%)",
        weight: 6,
        opacity: 0.9,
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
            width:40px;height:40px;
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="
              width:36px;height:36px;border-radius:50%;
              background:white;
              border:3px solid hsl(205,60%,48%);
              display:flex;align-items:center;justify-content:center;
              font-size:16px;
              box-shadow:0 2px 8px rgba(0,0,0,0.15);
            ">${poiEmoji[stop.type] || "📍"}</div>
          </div>
        `,
        className: "poi-marker",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
      marker.bindTooltip(stop.title, {
        permanent: false,
        direction: "top",
        className: "poi-tooltip-light",
        offset: [0, -22],
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
      labelsPaneRef.current = null;
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
              width:36px;height:36px;position:relative;
              display:flex;align-items:center;justify-content:center;
            ">
              <div style="
                width:28px;height:28px;border-radius:50%;
                background:hsl(35,85%,55%);
                border:3px solid white;
                display:flex;align-items:center;justify-content:center;
                font-size:12px;color:white;font-weight:bold;
                box-shadow:0 2px 8px rgba(0,0,0,0.2);
              ">${(p.display_name || "?")[0].toUpperCase()}</div>
            </div>
          `,
          className: "participant-marker",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: 500 }).addTo(map);
        marker.bindTooltip(p.display_name || "Participant", {
          permanent: false,
          direction: "top",
          className: "poi-tooltip-light",
          offset: [0, -18],
        });
        participantMarkersRef.current.set(p.id, marker);
      }
    });
  }, [participants]);

  // Update user position marker + traveled/remaining route
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

    if (!userMarkerRef.current) {
      const icon = L.divIcon({
        html: `
          <div style="
            width:52px;height:52px;position:relative;
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="
              position:absolute;width:52px;height:52px;border-radius:50%;
              background:hsl(205,80%,55%,0.15);
              animation:gps-pulse-light 2s ease-out infinite;
            "></div>
            <div style="
              width:22px;height:22px;position:relative;
              transform:rotate(0deg);
            ">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 20L12 16L20 20L12 2Z" fill="hsl(205,60%,48%)" stroke="white" stroke-width="2"/>
              </svg>
            </div>
          </div>
        `,
        className: "user-marker-icon",
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });

      userMarkerRef.current = L.marker(userPos, { icon, zIndexOffset: 1000 }).addTo(map);
      map.setView(userPos, 16);
    } else {
      userMarkerRef.current.setLatLng(userPos);
    }

    // Position user at bottom-center: offset the map center upward
    // so the user marker appears ~70% down the screen
    const mapSize = map.getSize();
    const offsetY = mapSize.y * 0.3; // shift center 30% up from middle → user at ~70% down
    const newCenter = offsetLatLng(map, userPos, offsetY);
    map.setView(newCenter, map.getZoom(), { animate: true, duration: 0.5 });

    // Rotate the map to match heading + apply perspective tilt via wrapper
    const container = map.getContainer();
    container.style.transition = "transform 0.5s ease-out";
    container.style.transformOrigin = "center center";
    container.style.transform = `rotate(${-heading}deg) scale(1.42)`;

    // Counter-rotate labels pane so text stays readable
    if (labelsPaneRef.current) {
      // Labels pane needs to counter-rotate relative to the map container
      // The pane is inside the rotated container, so we rotate it back
      labelsPaneRef.current.style.transition = "transform 0.5s ease-out";
      labelsPaneRef.current.style.transformOrigin = "center center";
      labelsPaneRef.current.style.transform = `rotate(${heading}deg)`;
    }
  }, [userPos, heading, route]);

  // Highlight current stop
  useEffect(() => {
    stopMarkersRef.current.forEach((marker, i) => {
      const el = marker.getElement();
      if (!el) return;
      const inner = el.querySelector("div[style*='border']") as HTMLElement;
      if (!inner) return;

      if (i === currentStopIndex) {
        inner.style.borderColor = "hsl(35,85%,55%)";
        inner.style.boxShadow = "0 2px 12px hsl(35,85%,55%,0.4)";
      } else {
        inner.style.borderColor = "hsl(205,60%,48%)";
        inner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      }
    });
  }, [currentStopIndex]);

  return (
    <>
      <style>{`
        @keyframes gps-pulse-light {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .poi-tooltip-light {
          background: white !important;
          color: hsl(160,30%,10%) !important;
          border: 1px solid hsl(0,0%,88%) !important;
          border-radius: 10px !important;
          padding: 5px 12px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .poi-tooltip-light::before {
          border-top-color: white !important;
        }
        .user-marker-icon {
          background: none !important;
          border: none !important;
        }
        .poi-marker {
          background: none !important;
          border: none !important;
        }
        .participant-marker {
          background: none !important;
          border: none !important;
        }
        .nav-map-wrapper {
          perspective: 800px;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
        .nav-map-inner {
          width: 100%;
          height: 100%;
          transform: rotateX(30deg);
          transform-origin: center 70%;
        }
      `}</style>
      <div ref={wrapperRef} className="nav-map-wrapper">
        <div ref={mapRef} className="nav-map-inner" />
      </div>
    </>
  );
};

export default NavigationMap;
