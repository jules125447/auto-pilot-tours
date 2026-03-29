import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Volume2, VolumeX, Play, Lock, Download } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NavigationMap from "@/components/navigation/NavigationMap";
import NavigationBar from "@/components/navigation/NavigationBar";
import DirectionBanner from "@/components/navigation/DirectionBanner";
import AudioOverlay from "@/components/navigation/AudioOverlay";
import { AnimatePresence, motion } from "framer-motion";
import { extractTurns, findNextTurn, haversine } from "@/lib/turnDetection";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import { startAmbientSound, stopAmbientSound, type AmbientSoundType } from "@/lib/ambientSounds";
import { useCircuitPreload } from "@/hooks/useCircuitPreload";
import { getRoute } from "@/lib/routing";
import type { TurnDirection } from "@/components/navigation/DirectionBanner";

const FADE_DURATION = 2000;
const CALIBRATION_DELAY_MS = 10000; // 10 seconds warmup

interface RouteProjection {
  point: [number, number];
  cumulative: number;
  distance: number;
  total: number;
}

function projectClosestPointOnRoute(
  lat: number,
  lng: number,
  route: [number, number][]
): RouteProjection {
  let bestDist = Infinity;
  let bestPoint: [number, number] = [lat, lng];
  let bestCum = 0;
  let total = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const ax = route[i][0], ay = route[i][1];
    const bx = route[i + 1][0], by = route[i + 1][1];
    const segLen = haversine(ax, ay, bx, by);
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((lat - ax) * dx + (lng - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const px = ax + t * dx;
    const py = ay + t * dy;
    const distance = haversine(lat, lng, px, py);

    if (distance < bestDist) {
      bestDist = distance;
      bestPoint = [px, py];
      bestCum = total + t * segLen;
    }

    total += segLen;
  }

  return {
    point: bestPoint,
    cumulative: bestCum,
    distance: bestDist,
    total,
  };
}

function interpolateRoutePoint(route: [number, number][], targetDistance: number): [number, number] {
  if (route.length < 2) return route[0] ?? [0, 0];

  let covered = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i];
    const end = route[i + 1];
    const segLen = haversine(start[0], start[1], end[0], end[1]);

    if (covered + segLen >= targetDistance) {
      const remaining = targetDistance - covered;
      const ratio = segLen === 0 ? 0 : remaining / segLen;
      return [
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio,
      ];
    }

    covered += segLen;
  }

  return route[route.length - 1];
}

const NavigationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: circuit, isLoading } = useCircuit(id);
  const { user } = useAuth();
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Check purchase/access
  useEffect(() => {
    if (!circuit) return;
    // Free circuits
    if (circuit.price === 0) { setHasAccess(true); setAccessChecked(true); return; }
    // Creator always has access
    if (user && circuit.creator_id === user.id) { setHasAccess(true); setAccessChecked(true); return; }
    // Check if unlocked via access key (sessionStorage)
    const unlockedCircuits = JSON.parse(sessionStorage.getItem("unlocked_circuits") || "[]");
    if (unlockedCircuits.includes(id)) { setHasAccess(true); setAccessChecked(true); return; }
    // Check purchase
    if (!user) { setAccessChecked(true); return; }
    const check = async () => {
      const { data } = await supabase
        .from("purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("circuit_id", id!)
        .limit(1);
      setHasAccess(!!(data && data.length > 0));
      setAccessChecked(true);
    };
    check();
  }, [user, circuit, id]);

  const [rawUserPos, setRawUserPos] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioOverlayText, setAudioOverlayText] = useState<string | null>(null);
  const [visitedStops, setVisitedStops] = useState<Set<number>>(new Set());
  const [triggeredAudioZones, setTriggeredAudioZones] = useState<Set<string>>(new Set());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { preload, loading: preloading, progress: preloadProgress, done: preloadDone } = useCircuitPreload();
  const [calibrated, setCalibrated] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; display_name: string | null; lat: number; lng: number }[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeMusicIdRef = useRef<string | null>(null);
  const activeSoundsRef = useRef<Map<string, any>>(new Map());
  const fadeIntervalRef = useRef<number | null>(null);
  const firstFixTimeRef = useRef<number | null>(null);
  const calibrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const prevPosRef = useRef<[number, number] | null>(null);
  const smoothedHeadingRef = useRef<number>(0);
  const routeProgressRef = useRef<number | null>(null);

  const { announceDirection, announceArrival, announceAudioZone } = useVoiceGuidance();

  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!rawUserPos) {
      setUserPos(null);
      routeProgressRef.current = null;
      return;
    }

    const routeCoords = circuit?.route as [number, number][] | undefined;
    if (!routeCoords || routeCoords.length < 2) {
      setUserPos(rawUserPos);
      routeProgressRef.current = null;
      return;
    }

    const projected = projectClosestPointOnRoute(rawUserPos[0], rawUserPos[1], routeCoords);
    if (projected.distance >= 200) {
      setUserPos(rawUserPos);
      routeProgressRef.current = null;
      return;
    }

    const previousProgress = routeProgressRef.current;
    let nextProgress = projected.cumulative;

    if (previousProgress !== null) {
      const maxBackwardStep = 4;
      const maxForwardStep = 18;
      const clampedProgress = Math.max(
        Math.max(0, previousProgress - maxBackwardStep),
        Math.min(projected.total, Math.min(projected.cumulative, previousProgress + maxForwardStep))
      );

      nextProgress = previousProgress + (clampedProgress - previousProgress) * 0.35;
    }

    routeProgressRef.current = nextProgress;
    setUserPos(interpolateRoutePoint(routeCoords, nextProgress));
  }, [rawUserPos, circuit?.route]);

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
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
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

    // Smooth heading using shortest-arc interpolation
    const smoothHeading = (raw: number) => {
      const prev = smoothedHeadingRef.current;
      let delta = raw - prev;
      // Shortest arc
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const smoothed = (prev + delta * 0.35 + 360) % 360;
      smoothedHeadingRef.current = smoothed;
      return smoothed;
    };

    // Calculate heading from two consecutive positions
    const calcHeading = (from: [number, number], to: [number, number]): number => {
      const dLng = (to[1] - from[1]) * Math.PI / 180;
      const lat1 = from[0] * Math.PI / 180;
      const lat2 = to[0] * Math.PI / 180;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Track first fix for calibration
        if (firstFixTimeRef.current === null) {
          firstFixTimeRef.current = Date.now();
          calibrationTimerRef.current = setTimeout(() => {
            setCalibrated(true);
          }, CALIBRATION_DELAY_MS);
        }

        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setRawUserPos(newPos);

        // Determine heading: prefer device heading, fallback to calculated
        let rawHeading: number | null = null;
        if (pos.coords.heading !== null && pos.coords.heading >= 0 && pos.coords.speed && pos.coords.speed > 0.5) {
          rawHeading = pos.coords.heading;
        } else if (prevPosRef.current) {
          const dist = haversine(prevPosRef.current[0], prevPosRef.current[1], newPos[0], newPos[1]);
          if (dist > 3) { // Only calc heading if moved > 3m to avoid jitter
            rawHeading = calcHeading(prevPosRef.current, newPos);
          }
        }

        if (rawHeading !== null) {
          setHeading(smoothHeading(rawHeading));
        }

        prevPosRef.current = newPos;

        // Speed in km/h (coords.speed is m/s)
        if (pos.coords.speed !== null && pos.coords.speed >= 0) {
          setSpeed(Math.round(pos.coords.speed * 3.6));
        }
      },
      (err) => console.warn("Geo error:", err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (calibrationTimerRef.current) clearTimeout(calibrationTimerRef.current);
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
      activeSoundsRef.current.forEach((instance) => stopAmbientSound(instance));
      activeSoundsRef.current.clear();
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, []);

  // Realtime presence for community participants
  useEffect(() => {
    if (!circuit || !user || !audioUnlocked) return;
    const channelName = `circuit-live-${circuit.id}`;
    const channel = supabase.channel(channelName, { config: { presence: { key: user.id } } });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others: typeof participants = [];
        Object.entries(state).forEach(([key, presences]) => {
          if (key === user.id) return;
          const p = (presences as any[])[0];
          if (p?.lat && p?.lng) {
            others.push({ id: key, display_name: p.display_name, lat: p.lat, lng: p.lng });
          }
        });
        setParticipants(others);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            display_name: user.email?.split("@")[0] || "Anonyme",
            lat: rawUserPos?.[0] || 0,
            lng: rawUserPos?.[1] || 0,
          });
        }
      });

    presenceChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [circuit?.id, user?.id, audioUnlocked]);

  // Broadcast position updates
  useEffect(() => {
    if (!presenceChannelRef.current || !rawUserPos || !user) return;
    presenceChannelRef.current.track({
      display_name: user.email?.split("@")[0] || "Anonyme",
      lat: rawUserPos[0],
      lng: rawUserPos[1],
    });
  }, [rawUserPos]);

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
    return projectClosestPointOnRoute(lat, lng, routeCoords).cumulative;
  }, []);

  // Audio zones — only trigger after calibration, use route projection
  useEffect(() => {
    if (!userPos || !circuit || !audioUnlocked || !calibrated) return;
    const [lat, lng] = userPos;

    const routeCoords = circuit.route as [number, number][];
    const hasRoute = routeCoords && routeCoords.length >= 2;

    circuit.audio_zones.forEach((zone) => {
      if (triggeredAudioZones.has(zone.id)) return;

      let shouldTrigger = false;

      if (hasRoute) {
        // Use route projection as primary (most accurate when snapped)
        const carCum = projectOnRoute(lat, lng, routeCoords);
        const zoneCum = projectOnRoute(zone.lat, zone.lng, routeCoords);
        if (Math.abs(carCum - zoneCum) < 60) {
          shouldTrigger = true;
        }
      } else {
        // Fallback: haversine
        const directDist = haversine(lat, lng, zone.lat, zone.lng);
        if (directDist < 60) {
          shouldTrigger = true;
        }
      }

      if (shouldTrigger) {
        setTriggeredAudioZones((prev) => new Set(prev).add(zone.id));
        
        if (zone.audio_url) {
          const audio = new Audio(zone.audio_url);
          audio.play().catch((e) => console.warn("Audio play failed:", e));
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
  }, [userPos, circuit, triggeredAudioZones, voiceEnabled, announceAudioZone, audioUnlocked, projectOnRoute, calibrated]);

  // Music segments — only trigger after calibration, use route projection
  useEffect(() => {
    if (!userPos || !circuit || !audioUnlocked || !calibrated) return;
    const [lat, lng] = userPos;
    const routeCoords = circuit.route as [number, number][];
    const hasRoute = routeCoords && routeCoords.length >= 2;

    circuit.music_segments.forEach((seg) => {
      let isInside = false;

      if (hasRoute) {
        const carCum = projectOnRoute(lat, lng, routeCoords);
        const startCum = projectOnRoute(seg.start_lat, seg.start_lng, routeCoords);
        const endCum = projectOnRoute(seg.end_lat, seg.end_lng, routeCoords);
        const minCum = Math.min(startCum, endCum) - 30;
        const maxCum = Math.max(startCum, endCum) + 30;
        if (carCum >= minCum && carCum <= maxCum) {
          isInside = true;
        }
      } else {
        // Fallback without route
        const distToStart = haversine(lat, lng, seg.start_lat, seg.start_lng);
        const distToEnd = haversine(lat, lng, seg.end_lat, seg.end_lng);
        const segLength = haversine(seg.start_lat, seg.start_lng, seg.end_lat, seg.end_lng);
        if (distToStart < 80 || distToEnd < 80 || (distToStart + distToEnd < segLength + 100)) {
          isInside = true;
        }
      }

      if (isInside && activeMusicIdRef.current !== seg.id && seg.preview_url) {
        if (musicAudioRef.current) {
          const old = musicAudioRef.current;
          fadeAudio(old, 0, () => { old.pause(); });
        }
        const audio = new Audio(seg.preview_url);
        audio.volume = 0;
        audio.loop = true;
        const startTimeSec = (seg as any).start_time;
        if (startTimeSec && startTimeSec > 0) {
          audio.currentTime = startTimeSec;
        }
        musicAudioRef.current = audio;
        activeMusicIdRef.current = seg.id;
        audio.play().then(() => { fadeAudio(audio, 0.7); }).catch((err) => {
          console.warn("Music play failed:", err);
          activeMusicIdRef.current = null;
          musicAudioRef.current = null;
        });
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
  }, [userPos, circuit, fadeAudio, audioUnlocked, projectOnRoute, calibrated]);

  // Sound segments — only trigger after calibration, use route projection
  useEffect(() => {
    if (!userPos || !circuit || !audioUnlocked || !calibrated) return;
    const [lat, lng] = userPos;
    const routeCoords = circuit.route as [number, number][];
    const hasRoute = routeCoords && routeCoords.length >= 2;
    const soundSegs = circuit.sound_segments || [];

    soundSegs.forEach((seg) => {
      let isInside = false;

      if (hasRoute) {
        const carCum = projectOnRoute(lat, lng, routeCoords);
        const startCum = projectOnRoute(seg.start_lat, seg.start_lng, routeCoords);
        const endCum = projectOnRoute(seg.end_lat, seg.end_lng, routeCoords);
        const minCum = Math.min(startCum, endCum) - 30;
        const maxCum = Math.max(startCum, endCum) + 30;
        if (carCum >= minCum && carCum <= maxCum) {
          isInside = true;
        }
      } else {
        const distToStart = haversine(lat, lng, seg.start_lat, seg.start_lng);
        const distToEnd = haversine(lat, lng, seg.end_lat, seg.end_lng);
        const segLength = haversine(seg.start_lat, seg.start_lng, seg.end_lat, seg.end_lng);
        if (distToStart < 80 || distToEnd < 80 || (distToStart + distToEnd < segLength + 100)) {
          isInside = true;
        }
      }

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
  }, [userPos, circuit, audioUnlocked, projectOnRoute, calibrated]);

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

  // Access gate - must have purchased or be creator
  if (accessChecked && !hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground text-center">Circuit verrouillé</h1>
        <p className="text-muted-foreground text-sm text-center max-w-sm">
          Vous devez acheter ce circuit pour y accéder. L'achat est définitif et vous donne un accès à vie.
        </p>
        <Link
          to={`/circuit/${id}`}
          className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
        >
          Voir le circuit
        </Link>
      </div>
    );
  }

  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show preload / start button if audio not unlocked
  if (!audioUnlocked) {
    const handleStartPreload = () => {
      if (circuit) preload(circuit);
    };

    const handleLaunch = () => {
      handleUnlockAudio();
    };

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
            {!preloading && !preloadDone && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleStartPreload}
                className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card/95 border border-border shadow-elevated"
              >
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <Download className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold text-foreground">Préparer le circuit</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Télécharge les données pour fonctionner hors-ligne
                  </p>
                </div>
              </motion.button>
            )}

            {preloading && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-5 p-8 rounded-2xl bg-card/95 border border-border shadow-elevated w-[320px]"
              >
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <div className="text-center w-full">
                  <h2 className="font-display text-lg font-bold text-foreground mb-1">Téléchargement…</h2>
                  <p className="text-xs text-muted-foreground mb-3">{preloadProgress.label}</p>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${preloadProgress.percent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">{preloadProgress.percent}%</p>
                </div>
              </motion.div>
            )}

            {preloadDone && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={handleLaunch}
                className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card/95 border border-border shadow-elevated"
              >
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <Play className="w-10 h-10 text-primary-foreground ml-1" />
                </div>
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold text-foreground">Lancer la navigation</h2>
                  <p className="text-sm text-muted-foreground mt-1">Toutes les données sont prêtes ✅</p>
                </div>
              </motion.button>
            )}
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
          participants={participants}
        />
        <DirectionBanner direction={currentDirection} distanceMeters={currentDistToTurn} nextDirection={turnInfo?.afterTurn?.direction} nextDistanceMeters={turnInfo?.distAfter} />
        <Link to={`/circuit/${circuit.id}`} className="absolute top-5 left-4 z-[1002] w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border border-border flex items-center justify-center transition-all hover:bg-card active:scale-95 shadow-md">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="absolute top-5 right-4 z-[1002] w-11 h-11 rounded-full bg-card/90 backdrop-blur-md border border-border flex items-center justify-center transition-all hover:bg-card active:scale-95 shadow-md">
          {voiceEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
        </button>
        {/* Calibration indicator */}
        <AnimatePresence>
          {!calibrated && userPos && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-[1003] px-4 py-2 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-md"
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Calibration GPS…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        isLastStopDone={currentStopIndex >= circuit.stops.length - 1 && visitedStops.has(currentStopIndex)}
        speed={speed}
      />
    </div>
  );
};

export default NavigationView;
