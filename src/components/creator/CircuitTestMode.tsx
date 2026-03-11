import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Square, X, FastForward, Volume2, Music, Smartphone } from "lucide-react";
import type { StopData, AudioZoneData, MusicSegmentData } from "@/pages/CircuitCreator";
import { MUSIC_LIBRARY } from "@/pages/CircuitCreator";
import DirectionBanner from "@/components/navigation/DirectionBanner";
import NavigationBar from "@/components/navigation/NavigationBar";
import { extractTurns, findNextTurn, haversine } from "@/lib/turnDetection";
import L from "leaflet";

interface CircuitTestModeProps {
  route: [number, number][];
  stops: StopData[];
  audioZones: AudioZoneData[];
  musicSegments: MusicSegmentData[];
  mapInstance: L.Map | null;
  onClose: () => void;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversine(lat1, lng1, lat2, lng2);
}

function interpolateRoute(route: [number, number][], progress: number): [number, number] {
  if (route.length === 0) return [0, 0];
  if (route.length === 1 || progress <= 0) return route[0];
  if (progress >= 1) return route[route.length - 1];

  const distances: number[] = [];
  let totalDist = 0;
  for (let i = 1; i < route.length; i++) {
    const d = haversineDistance(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1]);
    distances.push(d);
    totalDist += d;
  }

  const targetDist = progress * totalDist;
  let accumulated = 0;

  for (let i = 0; i < distances.length; i++) {
    if (accumulated + distances[i] >= targetDist) {
      const segProgress = (targetDist - accumulated) / distances[i];
      const lat = route[i][0] + (route[i + 1][0] - route[i][0]) * segProgress;
      const lng = route[i][1] + (route[i + 1][1] - route[i][1]) * segProgress;
      return [lat, lng];
    }
    accumulated += distances[i];
  }

  return route[route.length - 1];
}

function isInMusicSegment(
  carLat: number,
  carLng: number,
  seg: MusicSegmentData,
  route: [number, number][]
): boolean {
  const distToStart = haversineDistance(carLat, carLng, seg.startLat, seg.startLng);
  const distToEnd = haversineDistance(carLat, carLng, seg.endLat, seg.endLng);
  const segLength = haversineDistance(seg.startLat, seg.startLng, seg.endLat, seg.endLng);
  return distToStart <= segLength + 500 && distToEnd <= segLength + 500 && (distToStart + distToEnd) <= segLength * 1.5 + 200;
}

const CircuitTestMode = ({
  route,
  stops,
  audioZones,
  musicSegments,
  mapInstance,
  onClose,
}: CircuitTestModeProps) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [activeAudioZones, setActiveAudioZones] = useState<Set<string>>(new Set());
  const [activeMusicSegments, setActiveMusicSegments] = useState<Set<string>>(new Set());
  const [triggeredStops, setTriggeredStops] = useState<Set<string>>(new Set());
  const [showPhonePreview, setShowPhonePreview] = useState(true);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const carMarkerRef = useRef<L.Marker | null>(null);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const musicAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  const ttsActiveRef = useRef(false);

  const turns = useMemo(() => extractTurns(route), [route]);
  const carPos = interpolateRoute(route, progress);

  // Compute navigation data for the preview
  const nextTurnData = useMemo(() => {
    if (route.length < 2) return null;
    return findNextTurn(carPos[0], carPos[1], route, turns);
  }, [carPos, route, turns]);

  // Compute distances for nav bar
  const navBarData = useMemo(() => {
    // Total remaining distance
    let totalRemaining = 0;
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < route.length; i++) {
      const d = haversineDistance(carPos[0], carPos[1], route[i][0], route[i][1]);
      if (d < minDist) { minDist = d; closestIdx = i; }
    }
    for (let i = closestIdx; i < route.length - 1; i++) {
      totalRemaining += haversineDistance(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
    }

    // Next stop
    let nextStopIdx = 0;
    let distToNext = 0;
    for (let s = 0; s < stops.length; s++) {
      const d = haversineDistance(carPos[0], carPos[1], stops[s].lat, stops[s].lng);
      if (d > 80) {
        nextStopIdx = s;
        distToNext = d;
        break;
      }
      nextStopIdx = s + 1;
    }

    const avgSpeedMs = 40 * 1000 / 3600;
    return {
      totalRemaining,
      etaMinutes: Math.round(totalRemaining / avgSpeedMs / 60),
      distToNextStop: distToNext,
      etaNextStop: Math.round(distToNext / avgSpeedMs / 60),
      currentStopIndex: Math.min(nextStopIdx, stops.length - 1),
    };
  }, [carPos, route, stops]);

  // Update currentStopIndex
  useEffect(() => {
    setCurrentStopIndex(navBarData.currentStopIndex);
  }, [navBarData.currentStopIndex]);

  // Create car marker
  useEffect(() => {
    if (!mapInstance || route.length === 0) return;
    const icon = L.divIcon({
      html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🚗</div>`,
      className: "custom-marker",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const marker = L.marker(route[0], { icon, zIndexOffset: 1000 }).addTo(mapInstance);
    carMarkerRef.current = marker;
    return () => {
      mapInstance.removeLayer(marker);
      carMarkerRef.current = null;
    };
  }, [mapInstance, route]);

  const updateCarPosition = useCallback(
    (prog: number) => {
      if (!carMarkerRef.current || route.length === 0) return;
      const pos = interpolateRoute(route, prog);
      carMarkerRef.current.setLatLng(pos);
      if (mapInstance) mapInstance.panTo(pos, { animate: true, duration: 0.3 });

      const newActiveAudio = new Set<string>();
      audioZones.forEach((zone) => {
        const dist = haversineDistance(pos[0], pos[1], zone.lat, zone.lng);
        if (dist <= zone.radius) {
          newActiveAudio.add(zone.id);
          if (!activeAudioZones.has(zone.id) && zone.text && !ttsActiveRef.current) {
            ttsActiveRef.current = true;
            const utter = new SpeechSynthesisUtterance(zone.text);
            utter.lang = "fr-FR";
            utter.onend = () => { ttsActiveRef.current = false; };
            speechSynthesis.speak(utter);
          }
        }
      });
      setActiveAudioZones(newActiveAudio);

      const newTriggered = new Set(triggeredStops);
      stops.forEach((stop) => {
        const dist = haversineDistance(pos[0], pos[1], stop.lat, stop.lng);
        if (dist < 100 && !triggeredStops.has(stop.id)) newTriggered.add(stop.id);
      });
      setTriggeredStops(newTriggered);

      const newActiveMusic = new Set<string>();
      musicSegments.forEach((seg) => {
        if (isInMusicSegment(pos[0], pos[1], seg, route)) newActiveMusic.add(seg.id);
      });
      setActiveMusicSegments(newActiveMusic);
    },
    [route, audioZones, musicSegments, stops, mapInstance, activeAudioZones, triggeredStops]
  );

  useEffect(() => {
    musicSegments.forEach((seg) => {
      const track = MUSIC_LIBRARY.find((t) => t.id === seg.trackId);
      if (!track) return;
      if (activeMusicSegments.has(seg.id)) {
        if (!musicAudioRef.current[seg.id]) {
          const audio = new Audio(track.url);
          audio.loop = true;
          audio.volume = 0.4;
          audio.play().catch(() => {});
          musicAudioRef.current[seg.id] = audio;
        }
      } else {
        if (musicAudioRef.current[seg.id]) {
          musicAudioRef.current[seg.id].pause();
          delete musicAudioRef.current[seg.id];
        }
      }
    });
  }, [activeMusicSegments, musicSegments]);

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    const step = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      setProgress((prev) => {
        const next = prev + dt * 0.02 * speed;
        if (next >= 1) { setPlaying(false); return 1; }
        updateCarPosition(next);
        return next;
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, speed, updateCarPosition]);

  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      Object.values(musicAudioRef.current).forEach((a) => a.pause());
      musicAudioRef.current = {};
    };
  }, []);

  const handleClose = () => {
    setPlaying(false);
    speechSynthesis.cancel();
    Object.values(musicAudioRef.current).forEach((a) => a.pause());
    musicAudioRef.current = {};
    onClose();
  };

  const handleReset = () => {
    setPlaying(false);
    setProgress(0);
    setActiveAudioZones(new Set());
    setActiveMusicSegments(new Set());
    setTriggeredStops(new Set());
    speechSynthesis.cancel();
    Object.values(musicAudioRef.current).forEach((a) => a.pause());
    musicAudioRef.current = {};
    if (route.length > 0) updateCarPosition(0);
  };

  const currentStop = stops[currentStopIndex];

  return (
    <>
      {/* Phone preview window */}
      {showPhonePreview && (
        <div className="absolute top-4 right-4 z-[1001] w-[260px] h-[480px] rounded-[28px] border-4 border-foreground/20 bg-card shadow-elevated overflow-hidden flex flex-col">
          {/* Phone notch */}
          <div className="flex justify-center pt-1 pb-0 bg-card relative z-10">
            <div className="w-16 h-1.5 rounded-full bg-muted" />
          </div>

          {/* GPS Preview content */}
          <div className="flex-1 flex flex-col relative overflow-hidden">
            {/* Direction Banner (scaled) */}
            <div className="relative w-full shrink-0" style={{ transform: "scale(0.65)", transformOrigin: "top left", width: "154%" }}>
              {nextTurnData ? (
                <DirectionBanner
                  direction={nextTurnData.turn.direction}
                  distanceMeters={nextTurnData.distanceToTurn}
                  nextDirection={nextTurnData.afterTurn?.direction}
                  nextDistanceMeters={nextTurnData.distAfter}
                />
              ) : (
                <DirectionBanner
                  direction={progress >= 0.98 ? "arrive" : "straight"}
                  distanceMeters={navBarData.totalRemaining}
                />
              )}
            </div>

            {/* Mini map area placeholder */}
            <div className="flex-1 bg-muted/30 flex items-center justify-center relative">
              <div className="text-center">
                <div className="text-3xl mb-1">🚗</div>
                <p className="text-[10px] text-muted-foreground font-mono">{Math.round(progress * 100)}%</p>
              </div>

              {/* Active audio / music badges */}
              <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
                {activeMusicSegments.size > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[9px] font-medium">
                    <Music className="w-2.5 h-2.5" /> Musique
                  </span>
                )}
                {activeAudioZones.size > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground text-[9px] font-medium">
                    <Volume2 className="w-2.5 h-2.5" /> Audio
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Bar (scaled) */}
            <div className="shrink-0" style={{ transform: "scale(0.65)", transformOrigin: "bottom left", width: "154%" }}>
              <NavigationBar
                currentStop={currentStop ? {
                  id: currentStop.id,
                  title: currentStop.title,
                  type: currentStop.type,
                  duration: currentStop.duration,
                } : undefined}
                currentStopIndex={currentStopIndex}
                totalStops={stops.length}
                distanceRemaining={navBarData.totalRemaining}
                etaMinutes={navBarData.etaMinutes}
                distToNextStop={navBarData.distToNextStop}
                etaNextStop={navBarData.etaNextStop}
                onNext={() => setCurrentStopIndex(Math.min(currentStopIndex + 1, stops.length - 1))}
                onPrev={() => setCurrentStopIndex(Math.max(currentStopIndex - 1, 0))}
                hasGps={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Controls panel */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur-sm rounded-xl shadow-elevated border border-border p-4 w-[420px] max-w-[90vw]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            🚗 Mode test
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant={showPhonePreview ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPhonePreview(!showPhonePreview)}
              className="h-7 w-7 p-0"
              title="Aperçu GPS"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-7 w-7 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <Slider
            value={[progress * 100]}
            onValueChange={([v]) => {
              const p = v / 100;
              setProgress(p);
              updateCarPosition(p);
            }}
            min={0}
            max={100}
            step={0.5}
          />
          <p className="text-xs text-muted-foreground mt-1">{Math.round(progress * 100)}% du trajet</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 mb-3">
          <Button size="sm" onClick={() => setPlaying(!playing)} className="gap-1.5">
            {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? "Pause" : "Lancer"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            Recommencer
          </Button>
          <div className="flex items-center gap-1 ml-auto">
            <FastForward className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="text-xs bg-muted rounded px-1.5 py-1 border-none"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>
        </div>

        {/* Active indicators */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {activeMusicSegments.size > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">
              <Music className="w-3 h-3" /> Musique active
            </span>
          )}
          {activeAudioZones.size > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground">
              <Volume2 className="w-3 h-3" /> Audio zone
            </span>
          )}
          {triggeredStops.size > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {triggeredStops.size}/{stops.length} arrêts visités
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default CircuitTestMode;
