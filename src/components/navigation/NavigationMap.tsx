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

interface NavigationMapProps {
  route: [number, number][];
  stops: Stop[];
  userPos: [number, number] | null;
  heading: number;
  currentStopIndex: number;
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
}: NavigationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer for GPS feel
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    // Draw route
    if (route.length > 0) {
      const polyline = L.polyline(route, {
        color: "hsl(152, 50%, 42%)",
        weight: 5,
        opacity: 0.9,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Also draw a glow underneath
      L.polyline(route, {
        color: "hsl(152, 50%, 42%)",
        weight: 12,
        opacity: 0.2,
        smoothFactor: 1,
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
    }

    // POI markers
    stops.forEach((stop, i) => {
      const isNext = i === 0;
      const icon = L.divIcon({
        html: `
          <div style="
            position:relative;
            width:36px;height:36px;
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="
              width:32px;height:32px;border-radius:50%;
              background:hsl(160,20%,15%);
              border:2px solid hsl(152,50%,42%);
              display:flex;align-items:center;justify-content:center;
              font-size:14px;
              box-shadow:0 0 10px hsl(152,50%,42%,0.4);
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
        className: "poi-tooltip",
        offset: [0, -20],
      });
      stopMarkersRef.current.push(marker);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      stopMarkersRef.current = [];
    };
  }, [route, stops]);

  // Update user position marker
  useEffect(() => {
    if (!mapInstance.current || !userPos) return;
    const map = mapInstance.current;

    if (!userMarkerRef.current) {
      const icon = L.divIcon({
        html: `
          <div class="user-gps-marker" style="
            width:48px;height:48px;position:relative;
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="
              position:absolute;width:48px;height:48px;border-radius:50%;
              background:hsl(205,80%,55%,0.15);
              animation:gps-pulse 2s ease-out infinite;
            "></div>
            <div style="
              width:20px;height:20px;position:relative;
              transform:rotate(${heading}deg);
            ">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 20L12 16L20 20L12 2Z" fill="hsl(205,80%,55%)" stroke="white" stroke-width="1.5"/>
              </svg>
            </div>
          </div>
        `,
        className: "user-marker-icon",
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      userMarkerRef.current = L.marker(userPos, { icon, zIndexOffset: 1000 }).addTo(map);
      map.setView(userPos, 16);
    } else {
      userMarkerRef.current.setLatLng(userPos);

      // Update arrow rotation
      const el = userMarkerRef.current.getElement();
      if (el) {
        const arrow = el.querySelector("div[style*='rotate']") as HTMLElement;
        if (arrow) {
          arrow.style.transform = `rotate(${heading}deg)`;
        }
      }

      map.panTo(userPos, { animate: true, duration: 0.5 });
    }
  }, [userPos, heading]);

  // Highlight current stop
  useEffect(() => {
    stopMarkersRef.current.forEach((marker, i) => {
      const el = marker.getElement();
      if (!el) return;
      const inner = el.querySelector("div[style*='border']") as HTMLElement;
      if (!inner) return;

      if (i === currentStopIndex) {
        inner.style.borderColor = "hsl(35,85%,55%)";
        inner.style.boxShadow = "0 0 16px hsl(35,85%,55%,0.6)";
      } else {
        inner.style.borderColor = "hsl(152,50%,42%)";
        inner.style.boxShadow = "0 0 10px hsl(152,50%,42%,0.4)";
      }
    });
  }, [currentStopIndex]);

  return (
    <>
      <style>{`
        @keyframes gps-pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .poi-tooltip {
          background: hsl(160,20%,12%) !important;
          color: white !important;
          border: 1px solid hsl(152,50%,42%,0.4) !important;
          border-radius: 8px !important;
          padding: 4px 10px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .poi-tooltip::before {
          border-top-color: hsl(160,20%,12%) !important;
        }
        .user-marker-icon {
          background: none !important;
          border: none !important;
        }
        .poi-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
};

export default NavigationMap;
