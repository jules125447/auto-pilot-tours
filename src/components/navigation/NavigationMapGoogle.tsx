import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Locate } from "lucide-react";
import FixedUserArrow from "@/components/navigation/FixedUserArrow";
import { loadGoogleMapsJs } from "@/lib/maps/googleMapsLoader";
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

interface NavigationMapGoogleProps {
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

const ROUTE_COLOR = "#F25C1C";
const TRACKING_ANCHOR_Y = 0.78;

const poiEmoji: Record<string, string> = {
  viewpoint: "👁️",
  restaurant: "🍽️",
  parking: "🅿️",
  site: "🏛️",
};

// Sober map style approximating Positron (greys + minimal labels)
const SOBER_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e3f2" }] },
];

const NavigationMapGoogle = (props: NavigationMapGoogleProps) => {
  const {
    route,
    stops,
    userPos,
    heading,
    currentStopIndex,
    participants = [],
    routeToStart,
    recalculatedRoute,
    annotations = [],
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [tracking, setTracking] = useState(true);
  const userInteractingRef = useRef(false);
  const hasFitInitialBoundsRef = useRef(false);

  const fullLineRef = useRef<google.maps.Polyline | null>(null);
  const traveledLineRef = useRef<google.maps.Polyline | null>(null);
  const remainingLineRef = useRef<google.maps.Polyline | null>(null);
  const toStartLineRef = useRef<google.maps.Polyline | null>(null);
  const recalcLineRef = useRef<google.maps.Polyline | null>(null);

  const stopMarkersRef = useRef<google.maps.Marker[]>([]);
  const participantMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const annotationMarkersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const startFlagRef = useRef<google.maps.Marker | null>(null);

  const mapHeading = useMemo(() => (Number.isFinite(heading) ? heading : 0), [heading]);

  const handleRecenter = useCallback(() => {
    userInteractingRef.current = false;
    setTracking(true);
  }, []);

  // -------- Init --------
  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    loadGoogleMapsJs(["geometry"])
      .then((gmaps) => {
        if (cancelled || !containerRef.current) return;
        const map = new gmaps.maps.Map(containerRef.current, {
          center: { lat: 48.85, lng: 2.35 },
          zoom: 13,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          rotateControl: false,
          tilt: 0,
          styles: SOBER_STYLE,
          backgroundColor: "#f5f5f5",
        });

        const onUser = () => {
          userInteractingRef.current = true;
          setTracking(false);
        };
        map.addListener("dragstart", onUser);
        map.addListener("zoom_changed", () => {
          if (userInteractingRef.current) return;
        });
        // Detect manual gesture: any user input drops tracking
        containerRef.current.addEventListener("wheel", onUser, { passive: true });

        mapRef.current = map;
        setReady(true);
      })
      .catch((err) => {
        console.error("[GoogleMaps] load failed", err);
      });

    return () => {
      cancelled = true;
      stopMarkersRef.current.forEach((m) => m.setMap(null));
      stopMarkersRef.current = [];
      participantMarkersRef.current.forEach((m) => m.setMap(null));
      participantMarkersRef.current.clear();
      annotationMarkersRef.current.forEach((m) => m.setMap(null));
      annotationMarkersRef.current = [];
      userMarkerRef.current?.setMap(null);
      startFlagRef.current?.setMap(null);
      fullLineRef.current?.setMap(null);
      traveledLineRef.current?.setMap(null);
      remainingLineRef.current?.setMap(null);
      toStartLineRef.current?.setMap(null);
      recalcLineRef.current?.setMap(null);
      mapRef.current = null;
      hasFitInitialBoundsRef.current = false;
      setReady(false);
    };
  }, []);

  // -------- Route geometry --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Cleanup previous
    fullLineRef.current?.setMap(null);
    traveledLineRef.current?.setMap(null);
    remainingLineRef.current?.setMap(null);
    fullLineRef.current = null;
    traveledLineRef.current = null;
    remainingLineRef.current = null;
    startFlagRef.current?.setMap(null);
    startFlagRef.current = null;

    if (route.length < 2) return;

    const path = route.map(([lat, lng]) => ({ lat, lng }));

    fullLineRef.current = new google.maps.Polyline({
      map,
      path,
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 0.15,
      strokeWeight: 18,
      zIndex: 1,
    });
    traveledLineRef.current = new google.maps.Polyline({
      map,
      path: [],
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 0.5,
      strokeWeight: 7,
      zIndex: 2,
    });
    remainingLineRef.current = new google.maps.Polyline({
      map,
      path,
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 0.9,
      strokeWeight: 7,
      zIndex: 3,
    });

    // Start flag
    startFlagRef.current = new google.maps.Marker({
      map,
      position: { lat: route[0][0], lng: route[0][1] },
      icon: {
        url:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="${ROUTE_COLOR}" stroke="white" stroke-width="3"/><text x="20" y="26" font-size="18" text-anchor="middle">🏁</text></svg>`
          ),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20),
      },
      zIndex: 10,
    });

    if (!hasFitInitialBoundsRef.current) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 80);
      hasFitInitialBoundsRef.current = true;
    }
  }, [route, ready]);

  // -------- Stops --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    stopMarkersRef.current.forEach((m) => m.setMap(null));
    stopMarkersRef.current = [];
    stops.forEach((stop, i) => {
      const highlight = i === currentStopIndex;
      const emoji = poiEmoji[stop.type] || "📍";
      const marker = new google.maps.Marker({
        map,
        position: { lat: stop.lat, lng: stop.lng },
        title: stop.title,
        icon: {
          url:
            "data:image/svg+xml;utf8," +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="white" stroke="hsl(15,85%,55%)" stroke-width="2.5"/><text x="17" y="22" font-size="14" text-anchor="middle">${emoji}</text></svg>`
            ),
          scaledSize: new google.maps.Size(34, 34),
          anchor: new google.maps.Point(17, 17),
        },
        zIndex: highlight ? 20 : 15,
      });
      stopMarkersRef.current.push(marker);
    });
  }, [stops, currentStopIndex, ready]);

  // -------- Participants --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const ids = new Set(participants.map((p) => p.id));
    participantMarkersRef.current.forEach((m, id) => {
      if (!ids.has(id)) {
        m.setMap(null);
        participantMarkersRef.current.delete(id);
      }
    });
    participants.forEach((p) => {
      const existing = participantMarkersRef.current.get(p.id);
      const letter = (p.display_name || "?")[0].toUpperCase();
      const icon = {
        url:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="${ROUTE_COLOR}" stroke="white" stroke-width="3"/><text x="17" y="22" font-size="13" font-weight="700" fill="white" text-anchor="middle">${letter}</text></svg>`
          ),
        scaledSize: new google.maps.Size(34, 34),
        anchor: new google.maps.Point(17, 17),
      };
      if (existing) {
        existing.setPosition({ lat: p.lat, lng: p.lng });
      } else {
        participantMarkersRef.current.set(
          p.id,
          new google.maps.Marker({ map, position: { lat: p.lat, lng: p.lng }, icon })
        );
      }
    });
  }, [participants, ready]);

  // -------- Route to start --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    toStartLineRef.current?.setMap(null);
    toStartLineRef.current = null;
    if (routeToStart && routeToStart.length > 1) {
      toStartLineRef.current = new google.maps.Polyline({
        map,
        path: routeToStart.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: ROUTE_COLOR,
        strokeOpacity: 0.9,
        strokeWeight: 6,
        zIndex: 4,
        icons: [
          {
            icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
            offset: "0",
            repeat: "12px",
          },
        ],
      });
    }
  }, [routeToStart, ready]);

  // -------- Recalculated route --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    recalcLineRef.current?.setMap(null);
    recalcLineRef.current = null;
    if (recalculatedRoute && recalculatedRoute.length > 1) {
      recalcLineRef.current = new google.maps.Polyline({
        map,
        path: recalculatedRoute.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: ROUTE_COLOR,
        strokeOpacity: 0.9,
        strokeWeight: 5,
        zIndex: 5,
        icons: [
          {
            icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
            offset: "0",
            repeat: "12px",
          },
        ],
      });
    }
  }, [recalculatedRoute, ready]);

  // -------- Annotations --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    annotationMarkersRef.current.forEach((m) => m.setMap(null));
    annotationMarkersRef.current = [];
    annotations.forEach((ann) => {
      const sizeMap: Record<string, number> = { small: 36, medium: 52, large: 72 };
      const px = sizeMap[ann.size] || 52;
      const marker = new google.maps.Marker({
        map,
        position: { lat: ann.lat, lng: ann.lng },
        title: ann.caption || "",
        icon: {
          url:
            ann.image_url ||
            "data:image/svg+xml;utf8," +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}"><rect width="${px}" height="${px}" rx="10" fill="white" stroke="hsl(15,85%,55%)" stroke-width="2.5"/><text x="${px / 2}" y="${px / 2 + 8}" font-size="${px * 0.4}" text-anchor="middle">🖼</text></svg>`
              ),
          scaledSize: new google.maps.Size(px, px),
          anchor: new google.maps.Point(px / 2, px / 2),
        },
      });
      annotationMarkersRef.current.push(marker);
    });
  }, [annotations, ready]);

  // -------- User position / tracking --------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !userPos) return;

    let displayPos: [number, number] = userPos;
    let snappedSegIdx: number | null = null;
    if (route.length > 1) {
      const snap = snapPositionToRoute(route, userPos);
      if (snap && snap.lateralDistanceM < 45) {
        displayPos = [snap.lat, snap.lng];
        snappedSegIdx = snap.segmentIndex;
      }
    }

    // Traveled/remaining split
    if (route.length > 1 && remainingLineRef.current && traveledLineRef.current) {
      if (routeToStart && routeToStart.length > 1) {
        traveledLineRef.current.setPath([]);
        remainingLineRef.current.setPath(route.map(([la, ln]) => ({ lat: la, lng: ln })));
      } else {
        const splitIdx = snappedSegIdx !== null ? snappedSegIdx : findClosestRouteIndex(route, userPos);
        const traveled = route
          .slice(0, splitIdx + 1)
          .concat([displayPos])
          .map(([la, ln]) => ({ lat: la, lng: ln }));
        const remaining = [displayPos]
          .concat(route.slice(splitIdx + 1))
          .map(([la, ln]) => ({ lat: la, lng: ln }));
        traveledLineRef.current.setPath(traveled);
        remainingLineRef.current.setPath(remaining);
      }
    }

    // Off-tracking user marker
    if (!tracking) {
      const icon = {
        url:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 48 48"><polygon points="24,4 9,40 24,32 39,40" fill="${ROUTE_COLOR}" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg>`
          ),
        scaledSize: new google.maps.Size(52, 52),
        anchor: new google.maps.Point(26, 26),
      };
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          map,
          position: { lat: displayPos[0], lng: displayPos[1] },
          icon,
          zIndex: 100,
        });
      } else {
        userMarkerRef.current.setPosition({ lat: displayPos[0], lng: displayPos[1] });
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    if (tracking) {
      userInteractingRef.current = false;
      // Anchor user arrow at ~78% of screen height (shift center upward)
      const div = containerRef.current;
      const h = div?.clientHeight ?? 0;
      const shiftY = h * (TRACKING_ANCHOR_Y - 0.5);
      map.panTo({ lat: displayPos[0], lng: displayPos[1] });
      // Use heading via setOptions; Google's Map doesn't natively rotate
      // the basemap (rotation only works with vector maps when mapId is
      // provided). We rely on FixedUserArrow rotating its SVG instead.
      if (map.getZoom() && map.getZoom()! < 17) map.setZoom(17);
      if (shiftY !== 0) map.panBy(0, shiftY);
    }
  }, [userPos, mapHeading, route, tracking, routeToStart, ready]);

  return (
    <div className="nav-map-shell" style={{ width: "100%", height: "100%", position: "relative", background: "hsl(var(--background))" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <FixedUserArrow
        anchorY={TRACKING_ANCHOR_Y}
        bearing={mapHeading}
        visible={tracking && !!userPos && ready}
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
  );
};

export default NavigationMapGoogle;
