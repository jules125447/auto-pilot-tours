import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import NavigationMap from "@/components/navigation/NavigationMap";
import NavigationBar from "@/components/navigation/NavigationBar";
import AudioOverlay from "@/components/navigation/AudioOverlay";
import { AnimatePresence } from "framer-motion";

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NavigationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: circuit, isLoading } = useCircuit(id);

  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [visitedStops, setVisitedStops] = useState<Set<number>>(new Set());
  const watchIdRef = useRef<number | null>(null);

  // Start geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        if (pos.coords.heading && pos.coords.heading > 0) {
          setHeading(pos.coords.heading);
        }
      },
      (err) => console.warn("Geo error:", err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Auto-detect nearest next stop & trigger audio
  useEffect(() => {
    if (!userPos || !circuit) return;
    const [lat, lng] = userPos;

    // Check proximity to current stop (within 50m)
    const stop = circuit.stops[currentStopIndex];
    if (stop) {
      const dist = haversineDistance(lat, lng, stop.lat, stop.lng);
      if (dist < 50 && !visitedStops.has(currentStopIndex)) {
        setVisitedStops((prev) => new Set(prev).add(currentStopIndex));

        // Check audio zone
        const hasAudio = circuit.audio_zones.some(
          (az) => Math.abs(az.lat - stop.lat) < 0.001 && Math.abs(az.lng - stop.lng) < 0.001
        );
        if (hasAudio) {
          setAudioPlaying(true);
          setTimeout(() => setAudioPlaying(false), 6000);
        }
      }
    }
  }, [userPos, circuit, currentStopIndex, visitedStops]);

  // Calculate distances & ETA
  const getNavInfo = useCallback(() => {
    if (!circuit || !userPos) {
      return { distanceRemaining: 0, etaMinutes: 0, distToNextStop: 0, etaNextStop: 0 };
    }

    const [lat, lng] = userPos;
    const nextStop = circuit.stops[currentStopIndex];
    const distToNextStop = nextStop
      ? haversineDistance(lat, lng, nextStop.lat, nextStop.lng)
      : 0;

    // Rough total remaining: sum distances from current stop to end
    let totalRemaining = distToNextStop;
    for (let i = currentStopIndex; i < circuit.stops.length - 1; i++) {
      const a = circuit.stops[i];
      const b = circuit.stops[i + 1];
      totalRemaining += haversineDistance(a.lat, a.lng, b.lat, b.lng);
    }

    // Assume avg 40 km/h for driving
    const avgSpeedMs = 40 * 1000 / 3600;
    const etaMinutes = Math.round(totalRemaining / avgSpeedMs / 60);
    const etaNextStop = Math.round(distToNextStop / avgSpeedMs / 60);

    return { distanceRemaining: totalRemaining, etaMinutes, distToNextStop, etaNextStop };
  }, [circuit, userPos, currentStopIndex]);

  const navInfo = getNavInfo();

  const handleNextStop = () => {
    if (!circuit) return;
    setVisitedStops((prev) => new Set(prev).add(currentStopIndex));
    setCurrentStopIndex((i) => Math.min(circuit.stops.length - 1, i + 1));
  };

  const handlePrevStop = () => {
    setCurrentStopIndex((i) => Math.max(0, i - 1));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm font-mono">Chargement…</span>
        </div>
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground text-sm">Circuit introuvable</p>
        <Link to="/" className="text-primary text-sm hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const currentStop = circuit.stops[currentStopIndex];
  const currentAudio = currentStop
    ? circuit.audio_zones.find(
        (az) =>
          Math.abs(az.lat - currentStop.lat) < 0.001 &&
          Math.abs(az.lng - currentStop.lng) < 0.001
      )
    : null;

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-foreground">
      {/* Map */}
      <div className="flex-1 relative">
        <NavigationMap
          route={circuit.route}
          stops={circuit.stops}
          userPos={userPos}
          heading={heading}
          currentStopIndex={currentStopIndex}
        />

        {/* Back button */}
        <Link
          to={`/circuit/${circuit.id}`}
          className="absolute top-4 left-4 z-[1001] w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border border-border flex items-center justify-center transition-all hover:bg-card active:scale-95 shadow-md"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>

        {/* Audio overlay */}
        <AnimatePresence>
          {audioPlaying && currentAudio?.audio_text && (
            <AudioOverlay
              text={currentAudio.audio_text}
              onDismiss={() => setAudioPlaying(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom navigation bar – Waze-style */}
      <NavigationBar
        currentStop={currentStop}
        currentStopIndex={currentStopIndex}
        totalStops={circuit.stops.length}
        distanceRemaining={navInfo.distanceRemaining}
        etaMinutes={navInfo.etaMinutes}
        distToNextStop={navInfo.distToNextStop}
        etaNextStop={navInfo.etaNextStop}
        onNext={handleNextStop}
        onPrev={handlePrevStop}
        hasGps={!!userPos}
      />
    </div>
  );
};

export default NavigationView;
