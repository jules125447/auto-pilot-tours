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

    // Light tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    // Draw route - primary blue
    if (route.length > 0) {
      // Shadow
      L.polyline(route, {
        color: "hsl(205, 60%, 48%)",
        weight: 14,
        opacity: 0.15,
        smoothFactor: 1,
      }).addTo(map);

      // Main line
      const polyline = L.polyline(route, {
        color: "hsl(205, 60%, 48%)",
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [80, 80] });
    }

    // POI markers
    stops.forEach((stop, i) => {
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
    };
  }, [route, stops]);

  // Update user position marker
  useEffect(() => {
    if (!mapInstance.current || !userPos) return;
    const map = mapInstance.current;

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
              transform:rotate(${heading}deg);
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
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
};

export default NavigationMap;
