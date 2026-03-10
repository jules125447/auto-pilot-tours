import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Volume2, VolumeX } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import NavigationMap from "@/components/navigation/NavigationMap";
import NavigationBar from "@/components/navigation/NavigationBar";
import DirectionBanner from "@/components/navigation/DirectionBanner";
import AudioOverlay from "@/components/navigation/AudioOverlay";
import { AnimatePresence } from "framer-motion";
import { extractTurns, findNextTurn, haversine } from "@/lib/turnDetection";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import type { TurnDirection } from "@/components/navigation/DirectionBanner";

const NavigationView = () => {
  const { id } = useParams();
  const { data: circuit, isLoading } = useCircuit(id);

  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState(0);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [visitedStops, setVisitedStops] = useState<Set<number>>(new Set());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  const { announceDirection, announceArrival, announceAudioZone } = useVoiceGuidance();

  // Extract turns from route
  const turns = useMemo(() => {
    if (!circuit?.route) return [];
    return extractTurns(circuit.route as [number, number][]);
  }, [circuit?.route]);

  // Current turn info
  const turnInfo = useMemo(() => {
    if (!userPos || !circuit?.route || turns.length === 0) return null;
    return findNextTurn(userPos[0], userPos[1], circuit.route as [number, number][], turns);
  }, [userPos, circuit?.route, turns]);

  // Geolocation
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
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Voice announcements for turns
  useEffect(() => {
    if (!voiceEnabled || !turnInfo) return;
    announceDirection(turnInfo.turn.direction, turnInfo.distanceToTurn);
  }, [turnInfo, voiceEnabled, announceDirection]);

  // Auto-detect nearest stop & trigger audio
  useEffect(() => {
    if (!userPos || !circuit) return;
    const [lat, lng] = userPos;
    const stop = circuit.stops[currentStopIndex];
    if (!stop) return;

    const dist = haversine(lat, lng, stop.lat, stop.lng);
    if (dist < 50 && !visitedStops.has(currentStopIndex)) {
      setVisitedStops((prev) => new Set(prev).add(currentStopIndex));

      if (voiceEnabled) {
        announceArrival(stop.title);
      }

      const audioZone = circuit.audio_zones.find(
        (az) => Math.abs(az.lat - stop.lat) < 0.001 && Math.abs(az.lng - stop.lng) < 0.001
      );
      if (audioZone) {
        setAudioPlaying(true);
        if (voiceEnabled && audioZone.audio_text) {
          announceAudioZone(audioZone.audio_text);
        }
        setTimeout(() => setAudioPlaying(false), 6000);
      }
    }
  }, [userPos, circuit, currentStopIndex, visitedStops, voiceEnabled, announceArrival, announceAudioZone]);

  // Nav info calculations
  const getNavInfo = useCallback(() => {
    if (!circuit || !userPos) {
      return { distanceRemaining: 0, etaMinutes: 0, distToNextStop: 0, etaNextStop: 0 };
    }
    const [lat, lng] = userPos;
    const nextStop = circuit.stops[currentStopIndex];
    const distToNextStop = nextStop ? haversine(lat, lng, nextStop.lat, nextStop.lng) : 0;

    let totalRemaining = distToNextStop;
    for (let i = currentStopIndex; i < circuit.stops.length - 1; i++) {
      const a = circuit.stops[i];
      const b = circuit.stops[i + 1];
      totalRemaining += haversine(a.lat, a.lng, b.lat, b.lng);
    }

    const avgSpeedMs = (40 * 1000) / 3600;
    return {
      distanceRemaining: totalRemaining,
      etaMinutes: Math.round(totalRemaining / avgSpeedMs / 60),
      distToNextStop,
      etaNextStop: Math.round(distToNextStop / avgSpeedMs / 60),
    };
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
        <Link to="/" className="text-primary text-sm hover:underline">Retour à l'accueil</Link>
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

  // Determine current direction to show
  const currentDirection: TurnDirection = turnInfo?.turn.direction ?? "straight";
  const currentDistToTurn = turnInfo?.distanceToTurn ?? (navInfo.distToNextStop || 500);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Map */}
      <div className="flex-1 relative">
        <NavigationMap
          route={circuit.route}
          stops={circuit.stops}
          userPos={userPos}
          heading={heading}
          currentStopIndex={currentStopIndex}
        />

        {/* Direction banner at top */}
        <DirectionBanner
          direction={currentDirection}
          distanceMeters={currentDistToTurn}
          nextDirection={turnInfo?.afterTurn?.direction}
          nextDistanceMeters={turnInfo?.distAfter}
        />

        {/* Back button */}
        <Link
          to={`/circuit/${circuit.id}`}
          className="absolute top-5 left-4 z-[1002] w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border border-border flex items-center justify-center transition-all hover:bg-card active:scale-95 shadow-md"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>

        {/* Voice toggle */}
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="absolute top-5 right-4 z-[1002] w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border border-border flex items-center justify-center transition-all hover:bg-card active:scale-95 shadow-md"
        >
          {voiceEnabled ? (
            <Volume2 className="w-5 h-5 text-primary" />
          ) : (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

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

      {/* Bottom navigation bar */}
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
