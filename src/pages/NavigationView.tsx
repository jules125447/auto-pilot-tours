import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, Play, Lock, Download } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NavigationMap from "@/components/navigation/NavigationMap";
import NavigationBar from "@/components/navigation/NavigationBar";
import DirectionBanner from "@/components/navigation/DirectionBanner";
import NavigationTopHeader from "@/components/navigation/NavigationTopHeader";
// AudioOverlay removed — TTS plays without popup
import { extractTurns, findNextTurn, haversine } from "@/lib/turnDetection";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import { startAmbientSound, stopAmbientSound, type AmbientSoundType } from "@/lib/ambientSounds";
import { useCircuitPreload } from "@/hooks/useCircuitPreload";
import { getRoute } from "@/lib/routing";
import { matchPosition, prepareRoute, type MatcherState, type PreparedRoute } from "@/lib/mapMatcher";
import { snapToRoad } from "@/lib/maps/googleRoadsApi";
import { HAS_GOOGLE_MAPS_KEY } from "@/lib/maps/platform";
import type { TurnDirection } from "@/components/navigation/DirectionBanner";
import SpeedBubble from "@/components/navigation/SpeedBubble";
import { startSession, endSession, trackGpsPing, addDistance, hasAnalyticsConsent } from "@/lib/analytics";
import {
  ensureLocationPermission,
  getCurrentPositionUnified,
  watchPositionUnified,
  isNativePlatform,
} from "@/lib/nativeGeolocation";
import { activateWakeLock, releaseWakeLock } from "@/lib/nativeWakeLock";
import {
  startBackgroundGps,
  stopBackgroundGps,
  isAndroidNative,
  type BackgroundPosition,
} from "@/lib/nativeBackgroundGeolocation";
import { applyAudioElementHints } from "@/lib/nativeAudioSession";

const FADE_DURATION = 2000;
const CALIBRATION_DELAY_MS = 10000; // 10 seconds warmup
const START_ARRIVAL_RADIUS_METERS = 45;
// Strict threshold once a good fix has been seen; lenient before any fix
// so users with imprecise providers (WiFi/cell) still get a working position.
const MAX_ACCEPTED_GPS_ACCURACY_METERS = 60;
const INITIAL_GPS_ACCURACY_FALLBACK_METERS = 200;
const POSITION_HISTORY_LIMIT = 5;
const MIN_MOVEMENT_FOR_HEADING_METERS = 5;
const MAX_STATIONARY_DRIFT_METERS = 6;
const OUTLIER_BASE_ALLOWANCE_METERS = 22;
const HIGH_ACCURACY_TIMEOUT_MS = 10000;
const STALE_FIX_THRESHOLD_MS = 1500;
const RECOVERY_POLL_INTERVAL_MS = 1000;

interface RouteProjection {
  point: [number, number];
  cumulative: number;
  distance: number;
  total: number;
}

interface AcceptedGpsFix {
  accuracy: number | null;
  position: [number, number];
  speedKmh: number | null;
  timestamp: number;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function blendLatLng(
  from: [number, number],
  to: [number, number],
  factor: number
): [number, number] {
  return [
    from[0] + (to[0] - from[0]) * factor,
    from[1] + (to[1] - from[1]) * factor,
  ];
}

function calculateHeadingBetweenPoints(from: [number, number], to: [number, number]): number {
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getWeightedAveragePosition(samples: AcceptedGpsFix[]): [number, number] {
  if (samples.length === 0) return [0, 0];

  let weightedLat = 0;
  let weightedLng = 0;
  let totalWeight = 0;

  samples.forEach((sample, index) => {
    const recencyWeight = 1 + index / Math.max(1, samples.length - 1);
    const accuracyWeight = 1 / Math.max(sample.accuracy ?? 12, 5);
    const speedWeight = sample.speedKmh && sample.speedKmh > 25 ? 1.2 : 1;
    const weight = recencyWeight * accuracyWeight * speedWeight;

    weightedLat += sample.position[0] * weight;
    weightedLng += sample.position[1] * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) return samples[samples.length - 1].position;
  return [weightedLat / totalWeight, weightedLng / totalWeight];
}

function getPositionSmoothingFactor(
  speedKmh: number | null,
  accuracy: number | null,
  stationary: boolean
) {
  // Smaller factor = more smoothing (the displayed position glides instead of jumping).
  if (stationary) return 0.08;
  if (speedKmh === null) return accuracy !== null && accuracy <= 10 ? 0.32 : 0.24;
  if (speedKmh >= 80) return 0.55;
  if (speedKmh >= 50) return 0.45;
  if (speedKmh >= 25) return 0.36;
  return accuracy !== null && accuracy <= 10 ? 0.28 : 0.22;
}

function getHeadingSmoothingFactor(speedKmh: number | null, stationary: boolean) {
  if (stationary) return 0.08;
  if (speedKmh === null) return 0.16;
  if (speedKmh >= 80) return 0.3;
  if (speedKmh >= 50) return 0.24;
  if (speedKmh >= 20) return 0.2;
  return 0.14;
}

function isLikelyOutlier(
  distanceMeters: number,
  dtSeconds: number,
  speedKmh: number | null,
  accuracy: number | null
) {
  const expectedTravelMeters = speedKmh !== null ? (speedKmh / 3.6) * dtSeconds : 0;
  const maxReasonableDistance =
    expectedTravelMeters + Math.max(OUTLIER_BASE_ALLOWANCE_METERS, (accuracy ?? 15) * 1.6);

  return dtSeconds < 8 && distanceMeters > maxReasonableDistance * 1.8;
}

function roundGpsValue(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function inferLocationSource(
  accuracy: number | null,
  speedKmh: number | null,
  headingValue: number | null
) {
  if (accuracy !== null && accuracy <= 20) return "gps-likely";
  if ((speedKmh ?? 0) >= 15 && headingValue !== null && accuracy !== null && accuracy <= 35) {
    return "gps-likely";
  }
  if (accuracy !== null && accuracy <= 50) return "wifi-likely";
  return "network-likely";
}

function logGps(level: "info" | "warn" | "error", event: string, payload: Record<string, unknown>) {
  console[level](`[GPS] ${event}`, payload);
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
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioOverlayText, setAudioOverlayText] = useState<string | null>(null); // kept for state compat
  const [visitedStops, setVisitedStops] = useState<Set<number>>(new Set());
  const [triggeredAudioZones, setTriggeredAudioZones] = useState<Set<string>>(new Set());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const { preload, loading: preloading, progress: preloadProgress, done: preloadDone } = useCircuitPreload();
  const [calibrated, setCalibrated] = useState(false);
  const [participants, setParticipants] = useState<{ id: string; display_name: string | null; lat: number; lng: number }[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const routeToStartAbortRef = useRef<AbortController | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeMusicIdRef = useRef<string | null>(null);
  const activeSoundsRef = useRef<Map<string, any>>(new Map());
  const fadeIntervalRef = useRef<number | null>(null);
  const firstFixTimeRef = useRef<number | null>(null);
  const calibrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const lastAcceptedFixRef = useRef<AcceptedGpsFix | null>(null);
  const recentFixesRef = useRef<AcceptedGpsFix[]>([]);
  const smoothedHeadingRef = useRef<number>(0);
  const lastHeadingUpdateRef = useRef<number>(0);
  const lastAcceptedFixAtRef = useRef<number>(0);
  const highAccuracyRequestInFlightRef = useRef(false);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const routeProgressRef = useRef<number | null>(null);
  const [routeToStart, setRouteToStart] = useState<[number, number][] | null>(null);
  const [routeToStartInfo, setRouteToStartInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [routeToStartSteps, setRouteToStartSteps] = useState<import("@/lib/routing").RouteStep[]>([]);
  const [hasReachedStart, setHasReachedStart] = useState(false);

  // Off-route recalculation
  const OFF_ROUTE_THRESHOLD_METERS = 60;
  const OFF_ROUTE_CONFIRM_COUNT = 2; // consecutive fixes off-route before recalculating
  const offRouteCountRef = useRef(0);
  const recalcAbortRef = useRef<AbortController | null>(null);
  const lastRecalcTimeRef = useRef(0);
  const [recalculatedRoute, setRecalculatedRoute] = useState<[number, number][] | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [osrmSteps, setOsrmSteps] = useState<import("@/lib/routing").RouteStep[]>([]);
  const [welcomeSpoken, setWelcomeSpoken] = useState(false);

  // Audio ducking: lower other audio when voice guidance speaks
  // Uses ref counting to handle overlapping announcements correctly.
  const duckCountRef = useRef(0);
  const musicTargetVolumeRef = useRef(0.7);
  const musicFadeRafRef = useRef<number | null>(null);

  const fadeMusicTo = useCallback((target: number, durationMs: number) => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    if (musicFadeRafRef.current !== null) {
      cancelAnimationFrame(musicFadeRafRef.current);
      musicFadeRafRef.current = null;
    }
    const start = audio.volume;
    const startTime = performance.now();
    const step = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      try { audio.volume = Math.max(0, Math.min(1, start + (target - start) * eased)); } catch {}
      if (t < 1) {
        musicFadeRafRef.current = requestAnimationFrame(step);
      } else {
        musicFadeRafRef.current = null;
      }
    };
    musicFadeRafRef.current = requestAnimationFrame(step);
  }, []);

  const duckAudio = useCallback(() => {
    duckCountRef.current += 1;
    if (duckCountRef.current > 1) return;

    if (musicAudioRef.current) {
      const cur = musicAudioRef.current.volume;
      if (cur > 0.05) musicTargetVolumeRef.current = cur;
      fadeMusicTo(Math.min(0.15, musicTargetVolumeRef.current * 0.2), 350);
    }
    activeSoundsRef.current.forEach((instance: any) => {
      if (instance?.gainNode && instance?.ctx) {
        try {
          const target = (instance.originalVolume ?? 0.5) * 0.2;
          const now = instance.ctx.currentTime;
          instance.gainNode.gain.cancelScheduledValues(now);
          instance.gainNode.gain.setValueAtTime(instance.gainNode.gain.value, now);
          instance.gainNode.gain.linearRampToValueAtTime(target, now + 0.35);
        } catch {}
      }
    });
  }, [fadeMusicTo]);

  const unduckAudio = useCallback(() => {
    duckCountRef.current = Math.max(0, duckCountRef.current - 1);
    if (duckCountRef.current > 0) return;

    if (musicAudioRef.current) {
      fadeMusicTo(musicTargetVolumeRef.current, 700);
    }
    activeSoundsRef.current.forEach((instance: any) => {
      if (instance?.gainNode && instance?.ctx) {
        try {
          const target = instance.originalVolume ?? 0.5;
          const now = instance.ctx.currentTime;
          instance.gainNode.gain.cancelScheduledValues(now);
          instance.gainNode.gain.setValueAtTime(instance.gainNode.gain.value, now);
          instance.gainNode.gain.linearRampToValueAtTime(target, now + 0.7);
        } catch {}
      }
    });
  }, [fadeMusicTo]);

  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const { speak, announceDirection, announceArrival, announceAudioZone } = useVoiceGuidance({
    onSpeakStart: () => { duckAudio(); setIsVoiceSpeaking(true); },
    onSpeakEnd: () => { unduckAudio(); setIsVoiceSpeaking(false); },
  });

  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // Continuously tweened display values for the map so the arrow/map glide
  // smoothly between GPS fixes instead of jumping each second.
  const [displayPos, setDisplayPos] = useState<[number, number] | null>(null);
  const [displayHeading, setDisplayHeading] = useState(0);
  const displayPosRef = useRef<[number, number] | null>(null);
  const displayHeadingRef = useRef(0);
  const targetPosRef = useRef<[number, number] | null>(null);
  const targetHeadingRef = useRef(0);

  useEffect(() => { targetPosRef.current = userPos; }, [userPos]);
  useEffect(() => { targetHeadingRef.current = heading; }, [heading]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPushedPos: [number, number] | null = null;
    let lastPushedHeading = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // Position: exponential damp toward target (frame-rate independent).
      const target = targetPosRef.current;
      if (target) {
        const current = displayPosRef.current;
        if (!current) {
          displayPosRef.current = target;
          lastPushedPos = target;
          setDisplayPos(target);
        } else {
          const rate = 9; // snappy follow (~0.14 alpha at 60fps) — minimal lag behind real GPS
          const a = 1 - Math.exp(-rate * dt);
          const next: [number, number] = [
            current[0] + (target[0] - current[0]) * a,
            current[1] + (target[1] - current[1]) * a,
          ];
          displayPosRef.current = next;
          if (
            !lastPushedPos ||
            Math.abs(next[0] - lastPushedPos[0]) > 5e-7 ||
            Math.abs(next[1] - lastPushedPos[1]) > 5e-7
          ) {
            lastPushedPos = next;
            setDisplayPos(next);
          }
        }
      }

      // Heading: shortest-arc damped lerp.
      const tH = targetHeadingRef.current;
      const cur = displayHeadingRef.current;
      let delta = tH - cur;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const aH = 1 - Math.exp(-9 * dt);
      const nextH = (cur + delta * aH + 360) % 360;
      displayHeadingRef.current = nextH;
      let pushDelta = nextH - lastPushedHeading;
      if (pushDelta > 180) pushDelta -= 360;
      if (pushDelta < -180) pushDelta += 360;
      if (Math.abs(pushDelta) > 0.4) {
        lastPushedHeading = nextH;
        setDisplayHeading(nextH);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeSnapRoute = useMemo<[number, number][] | null>(() => {
    if (!hasReachedStart && currentStopIndex === 0 && routeToStart && routeToStart.length > 1) {
      return routeToStart;
    }

    const routeCoords = circuit?.route as [number, number][] | undefined;
    if (routeCoords && routeCoords.length > 1) {
      return routeCoords;
    }

    return null;
  }, [hasReachedStart, currentStopIndex, routeToStart, circuit?.route]);

  const activeSnapRouteKey = useMemo(() => {
    if (!activeSnapRoute) return "none";
    return !hasReachedStart && currentStopIndex === 0 && routeToStart && routeToStart.length > 1
      ? "route-to-start"
      : "circuit-route";
  }, [activeSnapRoute, hasReachedStart, currentStopIndex, routeToStart]);

  // ---- Map matcher state ----
  const preparedRouteRef = useRef<PreparedRoute | null>(null);
  const matcherStateRef = useRef<MatcherState | null>(null);
  const lastMatchTimeRef = useRef<number>(0);
  // Google Roads API snap-to-road state
  const gpsBufferRef = useRef<[number, number][]>([]);
  const googleSnapRef = useRef<{ pos: [number, number]; at: number } | null>(null);
  const snapInflightRef = useRef(false);

  // Reset matcher when the active route changes (entering circuit, recalculation, etc.)
  useEffect(() => {
    matcherStateRef.current = null;
    lastMatchTimeRef.current = 0;
    routeProgressRef.current = null;
    if (activeSnapRoute && activeSnapRoute.length >= 2) {
      preparedRouteRef.current = prepareRoute(activeSnapRoute);
    } else {
      preparedRouteRef.current = null;
    }
  }, [activeSnapRoute, activeSnapRouteKey, circuit?.id]);

  useEffect(() => {
    if (!rawUserPos) {
      setUserPos(null);
      return;
    }

    const prepared = preparedRouteRef.current;
    if (!prepared) {
      setUserPos(rawUserPos);
      return;
    }

    const accuracyMeters = gpsAccuracy ?? 25;
    const now = Date.now();
    const prevTime = lastMatchTimeRef.current || now;
    const dtSeconds = Math.max(0.1, Math.min(5, (now - prevTime) / 1000));
    lastMatchTimeRef.current = now;

    const state = matchPosition(
      {
        route: prepared.route,
        raw: rawUserPos,
        headingDeg: Number.isFinite(heading) ? heading : null,
        speedKmh: speed,
        accuracyMeters,
        dtSeconds,
        prev: matcherStateRef.current,
      },
      prepared
    );
    matcherStateRef.current = state;
    routeProgressRef.current = state.progressMeters;

    // Google Roads API snap-to-road: push raw fix into buffer, fire snap.
    // When fresh (< 2.5s old) we trust Google over the local matcher.
    if (HAS_GOOGLE_MAPS_KEY) {
      const buf = gpsBufferRef.current;
      buf.push(rawUserPos);
      if (buf.length > 10) buf.shift();
      if (!snapInflightRef.current && buf.length >= 2) {
        snapInflightRef.current = true;
        snapToRoad([...buf])
          .then((res) => {
            if (res) googleSnapRef.current = { pos: res.snapped, at: Date.now() };
          })
          .finally(() => {
            snapInflightRef.current = false;
          });
      }
    }

    const isApproachRoute = activeSnapRouteKey === "route-to-start";
    const maxLateral = isApproachRoute
      ? Math.min(80, Math.max(25, accuracyMeters * 1.4))
      : Math.min(55, Math.max(15, accuracyMeters * 1.1));

    // Prefer Google snap if recent (≤ 2.5s) and within sane lateral range
    const gs = googleSnapRef.current;
    if (gs && now - gs.at < 2500) {
      const dLat = gs.pos[0] - rawUserPos[0];
      const dLng = gs.pos[1] - rawUserPos[1];
      // ~ rough metric: 1 deg ~ 111km; check < 60m lateral
      const distM = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
      if (distM < 60) {
        setUserPos(gs.pos);
        return;
      }
    }

    if (state.lateralMeters > maxLateral || state.confidence < 0.2) {
      setUserPos(rawUserPos);
      return;
    }

    const blend = isApproachRoute ? 0.92 : Math.max(0.55, Math.min(0.95, state.confidence));
    const target = state.displayPos;
    setUserPos([
      rawUserPos[0] + (target[0] - rawUserPos[0]) * blend,
      rawUserPos[1] + (target[1] - rawUserPos[1]) * blend,
    ]);
  }, [rawUserPos, heading, gpsAccuracy, speed, activeSnapRouteKey]);

  // Fetch OSRM steps for roundabout detection
  useEffect(() => {
    if (!circuit?.route) return;
    const routeCoords = circuit.route as [number, number][];
    if (routeCoords.length < 2) return;
    
    const start = routeCoords[0];
    const end = routeCoords[routeCoords.length - 1];
    // Fetch route with steps to get maneuver types
    getRoute([start, end]).then((result) => {
      if (result?.steps) setOsrmSteps(result.steps);
    }).catch(() => {});
  }, [circuit?.route]);

  // Pick the active route + steps depending on whether we're heading to start or driving the circuit
  const activeNavRoute = useMemo<[number, number][] | null>(() => {
    if (!hasReachedStart && currentStopIndex === 0 && routeToStart && routeToStart.length > 1) {
      return routeToStart;
    }
    const r = circuit?.route as [number, number][] | undefined;
    return r && r.length > 1 ? r : null;
  }, [hasReachedStart, currentStopIndex, routeToStart, circuit?.route]);

  const activeNavSteps = useMemo(() => {
    if (!hasReachedStart && currentStopIndex === 0 && routeToStart && routeToStart.length > 1) {
      return routeToStartSteps;
    }
    return osrmSteps;
  }, [hasReachedStart, currentStopIndex, routeToStart, routeToStartSteps, osrmSteps]);

  const turns = useMemo(() => {
    if (!activeNavRoute) return [];
    return extractTurns(activeNavRoute, activeNavSteps.length > 0 ? activeNavSteps : undefined);
  }, [activeNavRoute, activeNavSteps]);

  const turnInfo = useMemo(() => {
    if (!userPos || !activeNavRoute || turns.length === 0) return null;
    return findNextTurn(userPos[0], userPos[1], activeNavRoute, turns);
  }, [userPos, activeNavRoute, turns]);

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

  const speedBubbleStunt: "idle" | "grabbed" | "returning" | "thrown" = "idle";

  // Speed warning trigger — when going too fast on the circuit
  const lastSpeedWarnRef = useRef(0);
  useEffect(() => {
    if (!voiceEnabled || !hasReachedStart || speed === null) return;
    if (speed < 110) return;
    const now = Date.now();
    if (now - lastSpeedWarnRef.current < 90_000) return;
    lastSpeedWarnRef.current = now;
    speak(`Attention, vous roulez à ${Math.round(speed)} km/h, ralentissez un peu.`);
  }, [speed, voiceEnabled, hasReachedStart, speak]);

  // Idle banter — speak occasionally when nothing else happens
  useEffect(() => {
    if (!audioUnlocked || !voiceEnabled || !hasReachedStart) return;
    const interval = window.setInterval(() => {
      // Banter removed with Tilo
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [audioUnlocked, voiceEnabled, hasReachedStart]);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      logGps("info", "permission_api_unavailable", {
        note: "Permissions API indisponible, utilisation directe du GPS haute précision.",
      });
      return;
    }

    let active = true;

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (!active) return;

        permissionStatusRef.current = status;

        const reportPermission = () => {
          logGps("info", "permission_state", {
            state: status.state,
            ios: "Active Localisation précise sur iPhone",
            android: "Autorise la position précise sur Android",
          });
        };

        reportPermission();
        status.onchange = reportPermission;
      })
      .catch((error) => {
        logGps("warn", "permission_query_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      active = false;
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, []);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      logGps("error", "geolocation_unavailable", {
        message: "Geolocation API non disponible sur cet appareil.",
      });
      return;
    }

    let disposed = false;

    // Smooth heading using shortest-arc interpolation
    const smoothHeading = (raw: number, factor: number) => {
      const prev = smoothedHeadingRef.current;
      let delta = raw - prev;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const smoothed = (prev + delta * factor + 360) % 360;
      smoothedHeadingRef.current = smoothed;
      return smoothed;
    };

    const processPosition = (
      pos: GeolocationPosition,
      source: "watch" | "initial" | "recovery"
    ) => {
      if (disposed) return;

      const timestamp = Number.isFinite(pos.timestamp) ? pos.timestamp : Date.now();
      const measuredAccuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;
      const measuredSpeedKmh =
        pos.coords.speed !== null && pos.coords.speed >= 0 ? pos.coords.speed * 3.6 : null;
      const measuredHeading =
        pos.coords.heading !== null && pos.coords.heading >= 0 ? pos.coords.heading : null;
      const measuredPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      const inferredSource = inferLocationSource(measuredAccuracy, measuredSpeedKmh, measuredHeading);

      setGpsAccuracy(measuredAccuracy);

      logGps("info", "fix_received", {
        source,
        lat: roundGpsValue(measuredPos[0], 6),
        lng: roundGpsValue(measuredPos[1], 6),
        accuracy: roundGpsValue(measuredAccuracy, 1),
        speedKmh: roundGpsValue(measuredSpeedKmh, 1),
        heading: roundGpsValue(measuredHeading, 1),
        timestamp: new Date(timestamp).toISOString(),
        provider: inferredSource,
      });

      // Looser threshold while we haven't accepted any fix yet — otherwise the
      // app gets stuck "calibrating" on devices without a true GPS chip.
      const hasPreviousAccepted = !!lastAcceptedFixRef.current;
      const accuracyLimit = hasPreviousAccepted
        ? MAX_ACCEPTED_GPS_ACCURACY_METERS
        : INITIAL_GPS_ACCURACY_FALLBACK_METERS;

      if (
        measuredAccuracy !== null &&
        measuredAccuracy > accuracyLimit
      ) {
        logGps("warn", "fix_rejected_accuracy", {
          source,
          accuracy: roundGpsValue(measuredAccuracy, 1),
          threshold: accuracyLimit,
          provider: inferredSource,
        });

        if (!hasPreviousAccepted) {
          return;
        }

        if ((measuredSpeedKmh ?? 0) < 1) {
          setSpeed((prev) => (prev === null ? 0 : Math.round(prev * 0.75)));
        }

        return;
      }

      const previousFix = lastAcceptedFixRef.current;
      let dtSeconds = 1;
      let distanceFromPrevious = 0;
      let derivedSpeedKmh = measuredSpeedKmh;

      if (previousFix) {
        dtSeconds = Math.max(0.15, (timestamp - previousFix.timestamp) / 1000);
        distanceFromPrevious = haversine(
          previousFix.position[0],
          previousFix.position[1],
          measuredPos[0],
          measuredPos[1]
        );

        if (derivedSpeedKmh === null) {
          derivedSpeedKmh = (distanceFromPrevious / dtSeconds) * 3.6;
        }

        if (isLikelyOutlier(distanceFromPrevious, dtSeconds, derivedSpeedKmh, measuredAccuracy)) {
          logGps("warn", "fix_rejected_outlier", {
            source,
            distanceMeters: roundGpsValue(distanceFromPrevious, 1),
            dtSeconds: roundGpsValue(dtSeconds, 2),
            accuracy: roundGpsValue(measuredAccuracy, 1),
            speedKmh: roundGpsValue(derivedSpeedKmh, 1),
          });
          return;
        }
      }

      const measuredFix: AcceptedGpsFix = {
        accuracy: measuredAccuracy,
        position: measuredPos,
        speedKmh: derivedSpeedKmh,
        timestamp,
      };

      recentFixesRef.current = [...recentFixesRef.current, measuredFix].slice(-POSITION_HISTORY_LIMIT);

      const stationary =
        !!previousFix &&
        (derivedSpeedKmh ?? 0) < 3 &&
        distanceFromPrevious < Math.max(MAX_STATIONARY_DRIFT_METERS, (measuredAccuracy ?? 12) * 0.25);

      const weightedAverage = getWeightedAveragePosition(recentFixesRef.current);
      const nextPosition = previousFix
        ? stationary
          ? previousFix.position
          : blendLatLng(
              previousFix.position,
              weightedAverage,
              getPositionSmoothingFactor(derivedSpeedKmh, measuredAccuracy, stationary)
            )
        : weightedAverage;

      const acceptedFix: AcceptedGpsFix = {
        accuracy: measuredAccuracy,
        position: nextPosition,
        speedKmh: derivedSpeedKmh,
        timestamp,
      };

      lastAcceptedFixRef.current = acceptedFix;
      lastAcceptedFixAtRef.current = Date.now();
      setRawUserPos(nextPosition);

      if (firstFixTimeRef.current === null) {
        firstFixTimeRef.current = timestamp;
        calibrationTimerRef.current = setTimeout(() => {
          setCalibrated(true);
        }, CALIBRATION_DELAY_MS);
      }

      let rawHeading: number | null = null;
      if (measuredHeading !== null && (derivedSpeedKmh ?? 0) > 4) {
        rawHeading = measuredHeading;
      } else if (previousFix && !stationary) {
        const headingDistance = haversine(
          previousFix.position[0],
          previousFix.position[1],
          nextPosition[0],
          nextPosition[1]
        );

        if (headingDistance >= MIN_MOVEMENT_FOR_HEADING_METERS) {
          rawHeading = calculateHeadingBetweenPoints(previousFix.position, nextPosition);
        }
      }

      let smoothedHeading: number | null = null;
      if (rawHeading !== null) {
        smoothedHeading = smoothHeading(rawHeading, getHeadingSmoothingFactor(derivedSpeedKmh, stationary));
        setHeading(smoothedHeading);
        lastHeadingUpdateRef.current = timestamp;
      }

      const targetSpeed = stationary ? 0 : Math.max(0, derivedSpeedKmh ?? 0);
      setSpeed((prev) => {
        const baseSpeed = prev ?? targetSpeed;
        const lerpedSpeed = baseSpeed + (targetSpeed - baseSpeed) * (stationary ? 0.45 : 0.35);
        return Math.round(clamp(lerpedSpeed, 0, 240));
      });

      logGps("info", "fix_accepted", {
        source,
        lat: roundGpsValue(nextPosition[0], 6),
        lng: roundGpsValue(nextPosition[1], 6),
        accuracy: roundGpsValue(measuredAccuracy, 1),
        speedKmh: roundGpsValue(derivedSpeedKmh, 1),
        heading: roundGpsValue(smoothedHeading ?? measuredHeading, 1),
        timestamp: new Date(timestamp).toISOString(),
        provider: inferredSource,
        stationary,
      });
    };

    const requestSingleHighAccuracyFix = async (reason: "initial" | "recovery") => {
      if (disposed || highAccuracyRequestInFlightRef.current) return;

      highAccuracyRequestInFlightRef.current = true;
      try {
        const pos = await getCurrentPositionUnified({
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: HIGH_ACCURACY_TIMEOUT_MS,
        });
        highAccuracyRequestInFlightRef.current = false;
        processPosition(pos as unknown as GeolocationPosition, reason);
      } catch (err: any) {
        highAccuracyRequestInFlightRef.current = false;
        logGps("warn", "single_fix_failed", {
          reason,
          code: err?.code,
          message: err?.message,
        });
      }
    };

    logGps("info", "tracking_started", {
      native: isNativePlatform(),
      enableHighAccuracy: true,
      maximumAge: 0,
      timeoutMs: HIGH_ACCURACY_TIMEOUT_MS,
      recoveryPollMs: RECOVERY_POLL_INTERVAL_MS,
      rejectAccuracyOverMeters: MAX_ACCEPTED_GPS_ACCURACY_METERS,
    });

    let unifiedWatch: { clear: () => void } | null = null;

    let bgGpsStarted = false;

    (async () => {
      await ensureLocationPermission();
      if (disposed) return;
      requestSingleHighAccuracyFix("initial");

      if (isAndroidNative()) {
        // Android: use @capacitor-community/background-geolocation as the
        // sole GPS source — much smoother + survives screen-off.
        const ok = await startBackgroundGps(
          (bg: BackgroundPosition) => {
            if (disposed) return;
            const synthetic = {
              coords: {
                latitude: bg.latitude,
                longitude: bg.longitude,
                accuracy: bg.accuracy,
                altitude: null,
                altitudeAccuracy: null,
                heading: bg.heading,
                speed: bg.speed,
              },
              timestamp: bg.timestamp,
            } as unknown as GeolocationPosition;
            processPosition(synthetic, "watch");
          },
          {
            distanceFilter: 2,
            interval: 500,
            fastestInterval: 250,
            activitiesInterval: 1000,
            // DESIRED_ACCURACY_HIGH
            desiredAccuracy: 0,
          }
        );
        bgGpsStarted = ok;
        if (!ok) {
          // Fallback to the unified watcher if the plugin didn't start.
          unifiedWatch = await watchPositionUnified(
            (pos) => processPosition(pos as unknown as GeolocationPosition, "watch"),
            (err) => logGps("warn", "watch_error", { code: err.code, message: err.message }),
            { enableHighAccuracy: true, maximumAge: 0, timeout: HIGH_ACCURACY_TIMEOUT_MS }
          );
        }
      } else {
        unifiedWatch = await watchPositionUnified(
          (pos) => processPosition(pos as unknown as GeolocationPosition, "watch"),
          (err) => {
            logGps("warn", "watch_error", { code: err.code, message: err.message });
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: HIGH_ACCURACY_TIMEOUT_MS }
        );
      }
    })();

    const recoveryInterval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;

      const now = Date.now();
      if (
        lastAcceptedFixAtRef.current === 0 ||
        now - lastAcceptedFixAtRef.current >= STALE_FIX_THRESHOLD_MS
      ) {
        requestSingleHighAccuracyFix("recovery");
      }
    }, RECOVERY_POLL_INTERVAL_MS);

    return () => {
      disposed = true;
      unifiedWatch?.clear();
      if (calibrationTimerRef.current) clearTimeout(calibrationTimerRef.current);
      window.clearInterval(recoveryInterval);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      routeToStartAbortRef.current?.abort();
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

  useEffect(() => {
    setHasReachedStart(false);
    setRouteToStart(null);
    routeProgressRef.current = null;
  }, [circuit?.id]);

  // Analytics: start session when navigation starts, end on unmount
  useEffect(() => {
    if (!circuit?.id || !audioUnlocked) return;
    if (!hasAnalyticsConsent()) return;
    startSession(circuit.id, user?.id || null);
    return () => {
      endSession(false);
    };
  }, [circuit?.id, audioUnlocked]);

  // Wake lock + background GPS — only while user is actively navigating
  useEffect(() => {
    if (!audioUnlocked) return;
    activateWakeLock();
    let started = false;
    startBackgroundGps(() => {
      // No-op: the regular watchPositionUnified is already feeding the
      // pipeline; this watcher exists purely to keep the OS from
      // suspending GPS when the screen turns off / app backgrounds.
    }).then((ok) => { started = ok; });
    return () => {
      releaseWakeLock();
      if (started) stopBackgroundGps();
    };
  }, [audioUnlocked]);


  // Analytics: track GPS pings periodically
  const lastTrackedPosRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!rawUserPos || !audioUnlocked) return;
    const last = lastTrackedPosRef.current;
    if (last) {
      const dist = haversine(last[0], last[1], rawUserPos[0], rawUserPos[1]);
      if (dist < 15) return;
      addDistance(dist);
    }
    lastTrackedPosRef.current = rawUserPos;
    trackGpsPing(rawUserPos[0], rawUserPos[1]);
  }, [rawUserPos, audioUnlocked]);

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

  // Waze-style tiered voice announcements (far / mid / near / imminent / now)
  useEffect(() => {
    if (!voiceEnabled || !turnInfo) return;
    const t = turnInfo.turn;
    // Stable per-turn signature so we never re-announce same tier for same turn
    const sig = `turn-${t.pointIndex}-${t.lat.toFixed(5)}-${t.lng.toFixed(5)}`;
    announceDirection(t.direction, turnInfo.distanceToTurn, sig, t.roundaboutExit);
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
          applyAudioElementHints(audio);
          audio.play().catch((e) => console.warn("Audio play failed:", e));
          setAudioPlaying(true);
          const clear = () => { setAudioPlaying(false); };
          audio.onended = clear;
          audio.onerror = clear;
        } else if (zone.audio_text) {
          setAudioPlaying(true);
          if (voiceEnabled) announceAudioZone(zone.audio_text);
          const words = zone.audio_text.trim().split(/\s+/).length;
          const displayMs = Math.max(4000, (words / 150) * 60 * 1000);
          setTimeout(() => { setAudioPlaying(false); }, displayMs);
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
        applyAudioElementHints(audio);
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

        const track = (seg as any).track_name as string | undefined;
        const artist = (seg as any).artist_name as string | undefined;
        if (voiceEnabled && track) {
          const line = artist
            ? `Petite ambiance musicale : ${track}, par ${artist}.`
            : `Petite ambiance musicale : ${track}.`;
          speak(line);
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
  }, [userPos, circuit, fadeAudio, audioUnlocked, projectOnRoute, calibrated, voiceEnabled, speak]);

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
      if (voiceEnabled) {
        speak(`Vous arrivez à ${stop.title}.`);
      }
      const isLast = currentStopIndex >= circuit.stops.length - 1;
      if (isLast && voiceEnabled) {
        speak(`Vous avez terminé le circuit ${circuit.title}. Félicitations !`);
      }
      // Auto-advance to next stop after arrival
      if (currentStopIndex < circuit.stops.length - 1) {
        setTimeout(() => {
          setCurrentStopIndex((i) => Math.min(circuit.stops.length - 1, i + 1));
        }, 2000);
      }
    }
  }, [userPos, circuit, currentStopIndex, visitedStops, voiceEnabled, speak]);

  // Off-route detection & recalculation
  useEffect(() => {
    if (!rawUserPos || !circuit || !hasReachedStart || !calibrated) return;

    const routeCoords = circuit.route as [number, number][] | undefined;
    if (!routeCoords || routeCoords.length < 2) return;

    const projected = projectClosestPointOnRoute(rawUserPos[0], rawUserPos[1], routeCoords);

    if (projected.distance > OFF_ROUTE_THRESHOLD_METERS) {
      offRouteCountRef.current += 1;
    } else {
      // Back on route — clear recalculated route
      offRouteCountRef.current = 0;
      if (recalculatedRoute) {
        setRecalculatedRoute(null);
      }
      return;
    }

    if (offRouteCountRef.current < OFF_ROUTE_CONFIRM_COUNT) return;

    // Throttle recalculations (min 5s apart)
    const now = Date.now();
    if (now - lastRecalcTimeRef.current < 5000) return;
    lastRecalcTimeRef.current = now;

    // Find the nearest upcoming route point to rejoin
    const nextStop = circuit.stops[currentStopIndex];
    if (!nextStop) return;

    // Recalculate from user position to next stop via OSRM
    recalcAbortRef.current?.abort();
    const controller = new AbortController();
    recalcAbortRef.current = controller;
    setIsRecalculating(true);

    getRoute([rawUserPos, [nextStop.lat, nextStop.lng]], { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted && result?.coordinates) {
          setRecalculatedRoute(result.coordinates);
          logGps("info", "route_recalculated", {
            distanceOffRoute: Math.round(projected.distance),
            newRouteLength: result.distance,
          });
          // Announce recalculation
          if (voiceEnabled) {
            const { speak } = { speak: (t: string) => {
              if (!("speechSynthesis" in window)) return;
              const u = new SpeechSynthesisUtterance(t);
              u.lang = "fr-FR";
              u.rate = 1.05;
              speechSynthesis.cancel();
              speechSynthesis.speak(u);
            }};
            speak("Recalcul de l'itinéraire");
          }
        }
        setIsRecalculating(false);
      })
      .catch(() => {
        setIsRecalculating(false);
      });

    return () => { controller.abort(); };
  }, [rawUserPos, circuit, hasReachedStart, calibrated, currentStopIndex, voiceEnabled, recalculatedRoute]);

  const getNavInfo = useCallback(() => {
    if (!circuit || !userPos) return { distanceRemaining: 0, etaMinutes: 0, distToNextStop: 0, etaNextStop: 0 };
    const [lat, lng] = userPos;
    const nextStop = circuit.stops[currentStopIndex];
    const distToNextStop = nextStop ? haversine(lat, lng, nextStop.lat, nextStop.lng) : 0;

    // Prefer route-polyline-based remaining distance (more accurate than haversine between POIs)
    let totalRemaining = 0;
    const routeCoords = circuit.route as [number, number][] | undefined;
    if (routeCoords && routeCoords.length > 1) {
      const proj = projectClosestPointOnRoute(lat, lng, routeCoords);
      totalRemaining = Math.max(0, proj.total - proj.cumulative);
    } else {
      totalRemaining = distToNextStop;
      for (let i = currentStopIndex; i < circuit.stops.length - 1; i++) {
        const a = circuit.stops[i]; const b = circuit.stops[i + 1];
        totalRemaining += haversine(a.lat, a.lng, b.lat, b.lng);
      }
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
  const circuitStartPoint = useMemo<[number, number] | null>(() => {
    if (!circuit) return null;
    // Always use the first point of the route (real start), not the first POI
    const routeCoords = circuit.route as [number, number][] | undefined;
    if (routeCoords && routeCoords.length > 0) {
      return routeCoords[0];
    }
    // Fallback to first stop if no route
    if (circuit.stops.length > 0) {
      return [circuit.stops[0].lat, circuit.stops[0].lng];
    }
    return null;
  }, [circuit]);

  useEffect(() => {
    if (!circuitStartPoint || !rawUserPos || currentStopIndex > 0 || hasReachedStart) {
      setRouteToStart(null);
      setRouteToStartInfo(null);
      return;
    }

    const distanceToStart = haversine(
      rawUserPos[0],
      rawUserPos[1],
      circuitStartPoint[0],
      circuitStartPoint[1]
    );

    if (distanceToStart <= START_ARRIVAL_RADIUS_METERS) {
      setRouteToStart(null);
      setRouteToStartInfo(null);
      setRouteToStartSteps([]);
      return;
    }

    routeToStartAbortRef.current?.abort();
    const abortController = new AbortController();
    routeToStartAbortRef.current = abortController;

    const timeoutId = window.setTimeout(async () => {
      const result = await getRoute([rawUserPos, circuitStartPoint], {
        signal: abortController.signal,
      });

      if (!abortController.signal.aborted) {
        setRouteToStart(result?.coordinates ?? null);
        setRouteToStartInfo(result ? { distance: result.distance, duration: result.duration } : null);
        setRouteToStartSteps(result?.steps ?? []);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [circuitStartPoint, rawUserPos, currentStopIndex, hasReachedStart]);

  useEffect(() => {
    if (!routeToStart) return;

    if (currentStopIndex > 0 || hasReachedStart) {
      setRouteToStart(null);
      setRouteToStartInfo(null);
      setRouteToStartSteps([]);
    }
  }, [routeToStart, currentStopIndex, hasReachedStart]);

  useEffect(() => {
    if (!circuitStartPoint || !rawUserPos || currentStopIndex > 0 || hasReachedStart) return;

    const rawDistanceToStart = haversine(
      rawUserPos[0],
      rawUserPos[1],
      circuitStartPoint[0],
      circuitStartPoint[1]
    );
    const snappedDistanceToStart = userPos
      ? haversine(userPos[0], userPos[1], circuitStartPoint[0], circuitStartPoint[1])
      : Infinity;

    if (Math.min(rawDistanceToStart, snappedDistanceToStart) <= START_ARRIVAL_RADIUS_METERS) {
      routeToStartAbortRef.current?.abort();
      setRouteToStart(null);
      setRouteToStartInfo(null);
      setRouteToStartSteps([]);
      setHasReachedStart(true);
      if (voiceEnabled && circuit) {
        speak(`C'est parti pour ${circuit.title} ! Bonne route.`);
      }
    }
  }, [circuitStartPoint, rawUserPos, userPos, currentStopIndex, hasReachedStart, voiceEnabled, circuit]);

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
      if (circuit) {
        preload(circuit);
      }
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
            routeToStart={routeToStart}
            annotations={circuit.map_annotations}
          />
          <div className="absolute inset-0 z-[1100] flex items-center justify-center" style={{
              background: "linear-gradient(180deg, hsl(30 25% 97% / 0.85) 0%, hsl(30 25% 97% / 0.65) 50%, hsl(30 25% 97% / 0.85) 100%)",
              backdropFilter: "blur(6px)",
            }}>
            {!preloading && !preloadDone && (
              <button
                onClick={handleStartPreload}
                className="flex flex-col items-center gap-5 p-10 rounded-3xl glass-card border border-primary/15 shadow-elevated group hover:shadow-glow transition-all"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
                  <Download className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground">Préparer le circuit</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-[240px]">
                    Télécharge les données pour fonctionner hors-ligne
                  </p>
                </div>
              </button>
            )}

            {preloading && (
              <div className="flex flex-col items-center gap-5 p-10 rounded-3xl glass-card border border-primary/15 shadow-elevated w-[320px]">
                <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
                </div>
                <div className="text-center w-full">
                  <h2 className="font-display text-lg font-bold text-foreground mb-1">Téléchargement…</h2>
                  <p className="text-xs text-muted-foreground mb-3">{preloadProgress.label}</p>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-hero rounded-full transition-all duration-300"
                      style={{ width: `${preloadProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">{preloadProgress.percent}%</p>
                </div>
              </div>
            )}

            {preloadDone && (
              <button
                onClick={handleLaunch}
                className="flex flex-col items-center gap-5 p-10 rounded-3xl glass-card border border-primary/15 shadow-elevated group hover:shadow-glow transition-all"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
                  <Play className="w-12 h-12 text-primary-foreground ml-1" />
                </div>
                <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground">Lancer la navigation</h2>
                  <p className="text-sm text-muted-foreground mt-2">Toutes les données sont prêtes ✅</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentStop = circuit.stops[currentStopIndex];
  const approachingStart = !!routeToStart && !hasReachedStart;
  const isArrivingAtStop = hasReachedStart && navInfo.distToNextStop > 0 && navInfo.distToNextStop < 80;
  const isArrivingAtStartPoint = approachingStart && (routeToStartInfo?.distance ?? Infinity) < 80;
  const currentDirection: TurnDirection = isArrivingAtStop || isArrivingAtStartPoint
    ? "arrive"
    : (turnInfo?.turn.direction ?? "straight");
  const currentDistToTurn = isArrivingAtStop
    ? navInfo.distToNextStop
    : isArrivingAtStartPoint
      ? (routeToStartInfo?.distance ?? 0)
      : (turnInfo?.distanceToTurn ?? (approachingStart ? (routeToStartInfo?.distance ?? 500) : (navInfo.distToNextStop || 500)));
  const currentStreetName = isArrivingAtStop
    ? currentStop?.title
    : isArrivingAtStartPoint
      ? "Point de départ"
      : approachingStart
        ? "Vers le point de départ"
        : undefined;

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-background">
      <div className="flex-1 relative">
        <NavigationMap
          route={circuit.route}
          stops={circuit.stops}
          userPos={displayPos ?? userPos}
          heading={displayHeading}
          currentStopIndex={currentStopIndex}
          participants={participants}
          routeToStart={routeToStart}
          recalculatedRoute={recalculatedRoute}
          annotations={circuit.map_annotations}
        />
        <NavigationTopHeader
          onBack={() => navigate(`/circuit/${circuit.id}`)}
          voiceEnabled={voiceEnabled}
          onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        />
        <DirectionBanner
          direction={currentDirection}
          distanceMeters={currentDistToTurn}
          streetName={currentStreetName}
          nextDirection={turnInfo?.afterTurn?.direction}
          nextDistanceMeters={turnInfo?.distAfter}
          roundaboutExit={turnInfo?.turn.roundaboutExit}
          nextStopTitle={currentStop?.title}
          distToNextStop={navInfo.distToNextStop}
        />


        {/* Calibration / Recalculating indicator */}
        {(!calibrated && userPos) && (
          <div className="absolute left-1/2 -translate-x-1/2 z-[1003] px-4 py-2 rounded-full bg-card/95 backdrop-blur-md shadow-elevated border border-border animate-fade-in"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-medium text-foreground">Calibration GPS…</span>
            </div>
          </div>
        )}
        {isRecalculating && (
          <div className="absolute left-1/2 -translate-x-1/2 z-[1003] px-4 py-2 rounded-full bg-gradient-hero shadow-glow animate-fade-in"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span className="text-xs font-semibold text-white">Recalcul…</span>
            </div>
          </div>
        )}
        <SpeedBubble speed={speed} stunt={speedBubbleStunt} />
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
        onStop={() => navigate(`/circuit/${circuit.id}`)}
        approachingStart={!!routeToStart && !hasReachedStart}
        distToStart={routeToStartInfo?.distance ?? null}
        etaToStartSeconds={routeToStartInfo?.duration ?? null}
        paused={isPaused}
        onTogglePause={() => setIsPaused((p) => !p)}
        onShowSteps={() => setShowSteps(true)}
      />

      {showSteps && (
        <div
          className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          onClick={() => setShowSteps(false)}
        >
          <div
            className="bg-card rounded-3xl shadow-elevated border border-primary/15 w-full max-w-md max-h-[75vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-foreground">Étapes du circuit</h2>
              <button
                onClick={() => setShowSteps(false)}
                className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
                aria-label="Fermer"
              >
                <span className="text-foreground text-lg leading-none">×</span>
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-3">
              {circuit.stops.map((s, i) => {
                const visited = visitedStops.has(i);
                const isCurrent = i === currentStopIndex;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 px-3 py-3 rounded-2xl mb-1.5 ${
                      isCurrent ? "bg-primary/10 border border-primary/30" : "bg-muted/40"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                        visited
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-accent text-accent-foreground"
                          : "bg-card border border-border text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{s.title}</p>
                      {s.duration && (
                        <p className="text-xs text-muted-foreground">{s.duration}</p>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        En cours
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NavigationView;
