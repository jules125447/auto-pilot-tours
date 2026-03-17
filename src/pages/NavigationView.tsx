import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Volume2, VolumeX, Play } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import NavigationMap from "@/components/navigation/NavigationMap";
import NavigationBar from "@/components/navigation/NavigationBar";
import DirectionBanner from "@/components/navigation/DirectionBanner";
import AudioOverlay from "@/components/navigation/AudioOverlay";
import { AnimatePresence } from "framer-motion";
import { extractTurns, findNextTurn, haversine } from "@/lib/turnDetection";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import { startAmbientSound, stopAmbientSound, type AmbientSoundType } from "@/lib/ambientSounds";
import type { TurnDirection } from "@/components/navigation/DirectionBanner";

const FADE_DURATION = 2000; // 2s fade in/out

const NavigationView = () => {
  const { id } = useParams();
  const { data: circuit, isLoading } = useCircuit(id);

  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState(0);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioOverlayText, setAudioOverlayText] = useState<string | null>(null);
  const [visitedStops, setVisitedStops] = useState<Set<number>>(new Set());
  const [triggeredAudioZones, setTriggeredAudioZones] = useState<Set<string>>(new Set());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const watchIdRef = useRef<number | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeMusicIdRef = useRef<string | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

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

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
      if (fadeIntervalRef.current) cancelAnimationFrame(fadeIntervalRef.current);
    };
  }, []);

  // Voice announcements for turns
  useEffect(() => {
    if (!voiceEnabled || !turnInfo) return;
    announceDirection(turnInfo.turn.direction, turnInfo.distanceToTurn);
  }, [turnInfo, voiceEnabled, announceDirection]);

  // Fade helper
  const fadeAudio = useCallback((audio: HTMLAudioElement, targetVol: number, onDone?: () => void) => {
    const startVol = audio.volume;
    const startTime = performance.now();
    const step = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      audio.volume = startVol + (targetVol - startVol) * progress;
      if (progress < 1) {
        fadeIntervalRef.current = requestAnimationFrame(step);
      } else {
        onDone?.();
      }
    };
    fadeIntervalRef.current = requestAnimationFrame(step);
  }, []);

  // Auto-detect audio zones by proximity to their actual position
  useEffect(() => {
    if (!userPos || !circuit) return;
    const [lat, lng] = userPos;

    // Check audio zones
    circuit.audio_zones.forEach((zone) => {
      if (triggeredAudioZones.has(zone.id)) return;
      const dist = haversine(lat, lng, zone.lat, zone.lng);
      if (dist < (zone.radius_meters || 50)) {
        setTriggeredAudioZones((prev) => new Set(prev).add(zone.id));

        if (zone.audio_text) {
          setAudioOverlayText(zone.audio_text);
          setAudioPlaying(true);
          if (voiceEnabled) {
            announceAudioZone(zone.audio_text);
          }
          // Estimate display time from text length
          const words = zone.audio_text.trim().split(/\s+/).length;
          const displayMs = Math.max(4000, (words / 150) * 60 * 1000);
          setTimeout(() => setAudioPlaying(false), displayMs);
        }
      }
    });
  }, [userPos, circuit, triggeredAudioZones, voiceEnabled, announceAudioZone]);

  // Auto-detect music segments by proximity to start/end points
  useEffect(() => {
    if (!userPos || !circuit) return;
    const [lat, lng] = userPos;

    circuit.music_segments.forEach((seg) => {
      const distToStart = haversine(lat, lng, seg.start_lat, seg.start_lng);
      const distToEnd = haversine(lat, lng, seg.end_lat, seg.end_lng);

      // Start music when near start point
      if (distToStart < 60 && activeMusicIdRef.current !== seg.id && seg.preview_url) {
        // Stop current music if any
        if (musicAudioRef.current) {
          fadeAudio(musicAudioRef.current, 0, () => {
            musicAudioRef.current?.pause();
            musicAudioRef.current = null;
          });
        }

        const audio = new Audio(seg.preview_url);
        audio.volume = 0;
        audio.loop = true;
        audio.play().then(() => {
          fadeAudio(audio, 0.7);
        }).catch(console.warn);
        musicAudioRef.current = audio;
        activeMusicIdRef.current = seg.id;
      }

      // Stop music when near end point
      if (distToEnd < 60 && activeMusicIdRef.current === seg.id && musicAudioRef.current) {
        const audioToStop = musicAudioRef.current;
        fadeAudio(audioToStop, 0, () => {
          audioToStop.pause();
          if (musicAudioRef.current === audioToStop) {
            musicAudioRef.current = null;
            activeMusicIdRef.current = null;
          }
        });
      }
    });
  }, [userPos, circuit, fadeAudio]);

  // Auto-detect nearest stop & trigger arrival
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
    }
  }, [userPos, circuit, currentStopIndex, visitedStops, voiceEnabled, announceArrival]);

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
          {audioPlaying && audioOverlayText && (
            <AudioOverlay
              text={audioOverlayText}
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
