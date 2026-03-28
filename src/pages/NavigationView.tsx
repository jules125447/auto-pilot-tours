import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Volume2, VolumeX, Play } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import NavigationMap from "@/components/navigation/NavigationMap";
import NavigationBar from "@/components/navigation/NavigationBar";
import DirectionBanner from "@/components/navigation/DirectionBanner";
import AudioOverlay from "@/components/navigation/AudioOverlay";
import { AnimatePresence, motion } from "framer-motion";
import { extractTurns, findNextTurn, haversine } from "@/lib/turnDetection";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import { startAmbientSound, stopAmbientSound, type AmbientSoundType } from "@/lib/ambientSounds";
import type { TurnDirection } from "@/components/navigation/DirectionBanner";

const FADE_DURATION = 2000;

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
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeMusicIdRef = useRef<string | null>(null);
  const activeSoundsRef = useRef<Map<string, any>>(new Map());
  const fadeIntervalRef = useRef<number | null>(null);

  const { announceDirection, announceArrival, announceAudioZone } = useVoiceGuidance();

  const turns = useMemo(() => {
    if (!circuit?.route) return [];
    return extractTurns(circuit.route as [number, number][]);
  }, [circuit?.route]);

  const turnInfo = useMemo(() => {
    if (!userPos || !circuit?.route || turns.length === 0) return null;
    return findNextTurn(userPos[0], userPos[1], circuit.route as [number, number][], turns);
  }, [userPos, circuit?.route, turns]);

  // Unlock audio context on user interaction
  const handleUnlockAudio = useCallback(() => {
    // Create and resume a temporary AudioContext to unlock audio
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    // Also play a silent HTML audio to unlock that path
    const silentAudio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
    silentAudio.volume = 0.01;
    silentAudio.play().catch(() => {});
    
    setTimeout(() => ctx.close().catch(() => {}), 100);
    setAudioUnlocked(true);
  }, []);

  // Geolocation
  useEffect(() => {
    if (!audioUnlocked) return;
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
  }, [audioUnlocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
      if (fadeIntervalRef.current) cancelAnimationFrame(fadeIntervalRef.current);
      // Stop all ambient sounds
      activeSoundsRef.current.forEach((instance) => stopAmbientSound(instance));
      activeSoundsRef.current.clear();
    };
  }, []);

  // Voice announcements
  useEffect(() => {
    if (!voiceEnabled || !turnInfo) return;
    announceDirection(turnInfo.turn.direction, turnInfo.distanceToTurn);
  }, [turnInfo, voiceEnabled, announceDirection]);

  // Fade helper for HTML Audio
  const fadeAudio = useCallback((audio: HTMLAudioElement, targetVol: number, onDone?: () => void) => {
    const startVol = audio.volume;
    const startTime = performance.now();
    const step = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      try { audio.volume = startVol + (targetVol - startVol) * progress; } catch {}
      if (progress < 1) {
        fadeIntervalRef.current = requestAnimationFrame(step);
      } else {
        onDone?.();
      }
    };
    fadeIntervalRef.current = requestAnimationFrame(step);
  }, []);

  // Project a point onto the route and return cumulative distance
  const projectOnRoute = useCallback((lat: number, lng: number, routeCoords: [number, number][]): number => {
    let bestDist = Infinity;
    let bestCum = 0;
    let cumDist = 0;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const ax = routeCoords[i][0], ay = routeCoords[i][1];
      const bx = routeCoords[i + 1][0], by = routeCoords[i + 1][1];
      const segLen = haversine(ax, ay, bx, by);
      const dx = bx - ax, dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : ((lat - ax) * dx + (lng - ay) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * dx, py = ay + t * dy;
      const d = haversine(lat, lng, px, py);
      if (d < bestDist) {
        bestDist = d;
        bestCum = cumDist + t * segLen;
      }
      cumDist += segLen;
    }
    return bestCum;
  }, []);

  // Audio zones — route-projection-based detection
  useEffect(() => {
    if (!userPos || !circuit || !audioUnlocked) return;
    const [lat, lng] = userPos;

    const routeCoords = circuit.route as [number, number][];
    if (!routeCoords || routeCoords.length < 2) return;

    const carCum = projectOnRoute(lat, lng, routeCoords);

    circuit.audio_zones.forEach((zone) => {
      if (triggeredAudioZones.has(zone.id)) return;

      const zoneCum = projectOnRoute(zone.lat, zone.lng, routeCoords);
      const triggerDist = 30;
      if (carCum >= zoneCum - triggerDist && carCum <= zoneCum + triggerDist) {
        setTriggeredAudioZones((prev) => new Set(prev).add(zone.id));
        
        if (zone.audio_url) {
          const audio = new Audio(zone.audio_url);
          audio.play().catch(() => {});
          setAudioOverlayText("🎙️ Audio en cours...");
          setAudioPlaying(true);
          audio.onended = () => setAudioPlaying(false);
          audio.onerror = () => setAudioPlaying(false);
        } else if (zone.audio_text) {
          setAudioOverlayText(zone.audio_text);
          setAudioPlaying(true);
          if (voiceEnabled) announceAudioZone(zone.audio_text);
          const words = zone.audio_text.trim().split(/\s+/).length;
          const displayMs = Math.max(4000, (words / 150) * 60 * 1000);
          setTimeout(() => setAudioPlaying(false), displayMs);
        }
      }
    });
  }, [userPos, circuit, triggeredAudioZones, voiceEnabled, announceAudioZone, audioUnlocked, projectOnRoute]);

  // Music segments — route-projection-based detection
  useEffect(() => {
    if (!userPos || !circuit || !audioUnlocked) return;
    const [lat, lng] = userPos;
    const routeCoords = circuit.route as [number, number][];
    if (!routeCoords || routeCoords.length < 2) return;

    const carCum = projectOnRoute(lat, lng, routeCoords);

    circuit.music_segments.forEach((seg) => {
      const startCum = projectOnRoute(seg.start_lat, seg.start_lng, routeCoords);
      const endCum = projectOnRoute(seg.end_lat, seg.end_lng, routeCoords);
      const minCum = Math.min(startCum, endCum);
      const maxCum = Math.max(startCum, endCum);
      const isInside = carCum >= minCum && carCum <= maxCum;

      if (isInside && activeMusicIdRef.current !== seg.id && seg.preview_url) {
        if (musicAudioRef.current) {
          const old = musicAudioRef.current;
          fadeAudio(old, 0, () => { old.pause(); });
        }
        const audio = new Audio(seg.preview_url);
        audio.crossOrigin = "anonymous";
        audio.volume = 0;
        audio.loop = true;
        const startTimeSec = (seg as any).start_time;
        if (startTimeSec && startTimeSec > 0) {
          audio.currentTime = startTimeSec;
        }
        musicAudioRef.current = audio;
        activeMusicIdRef.current = seg.id;
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.then(() => { fadeAudio(audio, 0.7); }).catch((err) => {
            console.warn("Music play failed:", err);
            activeMusicIdRef.current = null;
            musicAudioRef.current = null;
          });
        }
      }

      if (!isInside && activeMusicIdRef.current === seg.id && musicAudioRef.current) {
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
  }, [userPos, circuit, fadeAudio, audioUnlocked, projectOnRoute]);

  // Sound segments — route-projection-based detection
  useEffect(() => {
    if (!userPos || !circuit || !audioUnlocked) return;
    const [lat, lng] = userPos;
    const routeCoords = circuit.route as [number, number][];
    if (!routeCoords || routeCoords.length < 2) return;

    const carCum = projectOnRoute(lat, lng, routeCoords);
    const soundSegs = circuit.sound_segments || [];

    soundSegs.forEach((seg) => {
      const startCum = projectOnRoute(seg.start_lat, seg.start_lng, routeCoords);
      const endCum = projectOnRoute(seg.end_lat, seg.end_lng, routeCoords);
      const minCum = Math.min(startCum, endCum);
      const maxCum = Math.max(startCum, endCum);
      const isInside = carCum >= minCum && carCum <= maxCum;

      if (isInside && !activeSoundsRef.current.has(seg.id)) {
        const instance = startAmbientSound(seg.sound_type as AmbientSoundType, seg.volume);
        activeSoundsRef.current.set(seg.id, instance);
      }

      if (!isInside && activeSoundsRef.current.has(seg.id)) {
        const instance = activeSoundsRef.current.get(seg.id);
        stopAmbientSound(instance);
        activeSoundsRef.current.delete(seg.id);
      }
    });
  }, [userPos, circuit, audioUnlocked, projectOnRoute]);

  // Stop arrival detection
  useEffect(() => {
    if (!userPos || !circuit) return;
    const [lat, lng] = userPos;
    const stop = circuit.stops[currentStopIndex];
    if (!stop) return;
    const dist = haversine(lat, lng, stop.lat, stop.lng);
    if (dist < 50 && !visitedStops.has(currentStopIndex)) {
      setVisitedStops((prev) => new Set(prev).add(currentStopIndex));
      if (voiceEnabled) announceArrival(stop.title);
    }
  }, [userPos, circuit, currentStopIndex, visitedStops, voiceEnabled, announceArrival]);

  const getNavInfo = useCallback(() => {
    if (!circuit || !userPos) return { distanceRemaining: 0, etaMinutes: 0, distToNextStop: 0, etaNextStop: 0 };
    const [lat, lng] = userPos;
    const nextStop = circuit.stops[currentStopIndex];
    const distToNextStop = nextStop ? haversine(lat, lng, nextStop.lat, nextStop.lng) : 0;
    let totalRemaining = distToNextStop;
    for (let i = currentStopIndex; i < circuit.stops.length - 1; i++) {
      const a = circuit.stops[i]; const b = circuit.stops[i + 1];
      totalRemaining += haversine(a.lat, a.lng, b.lat, b.lng);
    }
    const avgSpeedMs = (40 * 1000) / 3600;
    return { distanceRemaining: totalRemaining, etaMinutes: Math.round(totalRemaining / avgSpeedMs / 60), distToNextStop, etaNextStop: Math.round(distToNextStop / avgSpeedMs / 60) };
  }, [circuit, userPos, currentStopIndex]);

  const navInfo = getNavInfo();

  const handleNextStop = () => {
    if (!circuit) return;
    setVisitedStops((prev) => new Set(prev).add(currentStopIndex));
    setCurrentStopIndex((i) => Math.min(circuit.stops.length - 1, i + 1));
  };
  const handlePrevStop = () => setCurrentStopIndex((i) => Math.max(0, i - 1));

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

  // Show start button if audio not unlocked
  if (!audioUnlocked) {
    return (
      <div className="h-screen flex flex-col relative overflow-hidden bg-background">
        <div className="flex-1 relative">
          <NavigationMap
            route={circuit.route}
            stops={circuit.stops}
            userPos={null}
            heading={0}
            currentStopIndex={0}
          />
          <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleUnlockAudio}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card/95 border border-border shadow-elevated"
            >
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                <Play className="w-10 h-10 text-primary-foreground ml-1" />
              </div>
              <div className="text-center">
                <h2 className="font-display text-xl font-bold text-foreground">Démarrer la navigation</h2>
                <p className="text-sm text-muted-foreground mt-1">Appuyez pour activer le GPS et l'audio</p>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  const currentStop = circuit.stops[currentStopIndex];
  const currentDirection: TurnDirection = turnInfo?.turn.direction ?? "straight";
  const currentDistToTurn = turnInfo?.distanceToTurn ?? (navInfo.distToNextStop || 500);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-background">
      <div className="flex-1 relative">
        <NavigationMap
          route={circuit.route}
          stops={circuit.stops}
          userPos={userPos}
          heading={heading}
          currentStopIndex={currentStopIndex}
        />
        <DirectionBanner direction={currentDirection} distanceMeters={currentDistToTurn} nextDirection={turnInfo?.afterTurn?.direction} nextDistanceMeters={turnInfo?.distAfter} />
        <Link to={`/circuit/${circuit.id}`} className="absolute top-5 left-4 z-[1002] w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border border-border flex items-center justify-center transition-all hover:bg-card active:scale-95 shadow-md">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="absolute top-5 right-4 z-[1002] w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border border-border flex items-center justify-center transition-all hover:bg-card active:scale-95 shadow-md">
          {voiceEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {audioPlaying && audioOverlayText && <AudioOverlay text={audioOverlayText} onDismiss={() => setAudioPlaying(false)} />}
        </AnimatePresence>
      </div>
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
