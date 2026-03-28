import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Square, X, FastForward, Volume2, Music, Waves } from "lucide-react";
import type { StopData, AudioZoneData, MusicSegmentData, SoundSegmentData } from "@/pages/CircuitCreator";
import { haversine } from "@/lib/turnDetection";
import { startAmbientSound, stopAmbientSound, type AmbientSoundType } from "@/lib/ambientSounds";
import L from "leaflet";

interface CircuitTestModeProps {
  route: [number, number][];
  stops: StopData[];
  audioZones: AudioZoneData[];
  musicSegments: MusicSegmentData[];
  soundSegments: SoundSegmentData[];
  mapInstance: L.Map | null;
  onClose: () => void;
}

function dist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversine(lat1, lng1, lat2, lng2);
}

// Compute cumulative distances along the route
function computeCumulativeDist(route: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < route.length; i++) {
    cum.push(cum[i - 1] + dist(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1]));
  }
  return cum;
}

// Project a point onto the route and return cumulative distance along route
function projectOnRoute(lat: number, lng: number, route: [number, number][], cumDist: number[]): number {
  let bestDist = Infinity;
  let bestCum = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const ax = route[i][0], ay = route[i][1];
    const bx = route[i + 1][0], by = route[i + 1][1];
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((lat - ax) * dx + (lng - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    const d = dist(lat, lng, px, py);
    if (d < bestDist) {
      bestDist = d;
      bestCum = cumDist[i] + t * (cumDist[i + 1] - cumDist[i]);
    }
  }
  return bestCum;
}

function interpolateRoute(route: [number, number][], progress: number, cumDist: number[]): [number, number] {
  if (route.length === 0) return [0, 0];
  if (route.length === 1 || progress <= 0) return route[0];
  const totalDist = cumDist[cumDist.length - 1];
  if (progress >= 1) return route[route.length - 1];

  const targetDist = progress * totalDist;

  for (let i = 0; i < cumDist.length - 1; i++) {
    if (cumDist[i + 1] >= targetDist) {
      const segLen = cumDist[i + 1] - cumDist[i];
      const t = segLen === 0 ? 0 : (targetDist - cumDist[i]) / segLen;
      return [
        route[i][0] + (route[i + 1][0] - route[i][0]) * t,
        route[i][1] + (route[i + 1][1] - route[i][1]) * t,
      ];
    }
  }
  return route[route.length - 1];
}

const FADE_DURATION = 2000;

const CircuitTestMode = ({
  route,
  stops,
  audioZones,
  musicSegments,
  soundSegments,
  mapInstance,
  onClose,
}: CircuitTestModeProps) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [activeAudioZones, setActiveAudioZones] = useState<Set<string>>(new Set());
  const [activeMusicIds, setActiveMusicIds] = useState<Set<string>>(new Set());
  const [activeSoundIds, setActiveSoundIds] = useState<Set<string>>(new Set());
  const [triggeredStops, setTriggeredStops] = useState<Set<string>>(new Set());

  const carMarkerRef = useRef<L.Marker | null>(null);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const musicAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  const soundInstancesRef = useRef<Record<string, ReturnType<typeof startAmbientSound>>>({});
  const ttsActiveRef = useRef(false);

  // Precompute cumulative distances
  const cumDistRef = useRef<number[]>([]);
  if (cumDistRef.current.length !== route.length) {
    cumDistRef.current = computeCumulativeDist(route);
  }
  const cumDist = cumDistRef.current;

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
      const pos = interpolateRoute(route, prog, cumDist);
      carMarkerRef.current.setLatLng(pos);
      if (mapInstance) mapInstance.panTo(pos, { animate: true, duration: 0.3 });

      const totalDist = cumDist[cumDist.length - 1];
      const carCum = prog * totalDist;

      // Audio zones (route-projection-based)
      const newActiveAudio = new Set<string>();
      audioZones.forEach((zone) => {
        const zoneCum = projectOnRoute(zone.lat, zone.lng, route, cumDist);
        const triggerDist = 30; // 30m window
        if (carCum >= zoneCum - triggerDist && carCum <= zoneCum + triggerDist) {
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

      // Stops
      const newTriggered = new Set(triggeredStops);
      stops.forEach((stop) => {
        const d = dist(pos[0], pos[1], stop.lat, stop.lng);
        if (d < 100 && !triggeredStops.has(stop.id)) newTriggered.add(stop.id);
      });
      setTriggeredStops(newTriggered);

      // Music segments (route-projection-based)
      const newActiveMusic = new Set<string>();
      musicSegments.forEach((seg) => {
        const startCum = projectOnRoute(seg.startLat, seg.startLng, route, cumDist);
        const endCum = projectOnRoute(seg.endLat, seg.endLng, route, cumDist);
        const minCum = Math.min(startCum, endCum);
        const maxCum = Math.max(startCum, endCum);
        if (carCum >= minCum && carCum <= maxCum) {
          newActiveMusic.add(seg.id);
        }
      });
      setActiveMusicIds(newActiveMusic);

      // Sound segments (route-projection-based)
      const newActiveSound = new Set<string>();
      soundSegments.forEach((seg) => {
        const startCum = projectOnRoute(seg.startLat, seg.startLng, route, cumDist);
        const endCum = projectOnRoute(seg.endLat, seg.endLng, route, cumDist);
        const minCum = Math.min(startCum, endCum);
        const maxCum = Math.max(startCum, endCum);
        if (carCum >= minCum && carCum <= maxCum) {
          newActiveSound.add(seg.id);
        }
      });
      setActiveSoundIds(newActiveSound);
    },
    [route, cumDist, audioZones, musicSegments, soundSegments, stops, mapInstance, activeAudioZones, triggeredStops]
  );

  // Music fade in/out
  useEffect(() => {
    musicSegments.forEach((seg) => {
      if (!seg.previewUrl) return;
      if (activeMusicIds.has(seg.id)) {
        if (!musicAudioRef.current[seg.id]) {
          const audio = new Audio(seg.previewUrl);
          audio.loop = true;
          audio.volume = 0;
          audio.play().catch(() => {});
          musicAudioRef.current[seg.id] = audio;
          const startTime = Date.now();
          const fadeIn = () => {
            const elapsed = Date.now() - startTime;
            const vol = Math.min(elapsed / FADE_DURATION, 1) * 0.5;
            if (musicAudioRef.current[seg.id]) {
              musicAudioRef.current[seg.id].volume = vol;
              if (vol < 0.5) requestAnimationFrame(fadeIn);
            }
          };
          requestAnimationFrame(fadeIn);
        }
      } else {
        if (musicAudioRef.current[seg.id]) {
          const audio = musicAudioRef.current[seg.id];
          const startVol = audio.volume;
          const startTime = Date.now();
          const fadeOut = () => {
            const elapsed = Date.now() - startTime;
            const vol = Math.max(startVol - (elapsed / FADE_DURATION) * startVol, 0);
            audio.volume = vol;
            if (vol > 0) {
              requestAnimationFrame(fadeOut);
            } else {
              audio.pause();
              delete musicAudioRef.current[seg.id];
            }
          };
          requestAnimationFrame(fadeOut);
        }
      }
    });
  }, [activeMusicIds, musicSegments]);

  // Sound segments fade in/out
  useEffect(() => {
    soundSegments.forEach((seg) => {
      if (activeSoundIds.has(seg.id)) {
        if (!soundInstancesRef.current[seg.id]) {
          soundInstancesRef.current[seg.id] = startAmbientSound(seg.soundType as AmbientSoundType, seg.volume);
        }
      } else {
        if (soundInstancesRef.current[seg.id]) {
          stopAmbientSound(soundInstancesRef.current[seg.id]);
          delete soundInstancesRef.current[seg.id];
        }
      }
    });
  }, [activeSoundIds, soundSegments]);

  // Animation loop
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      Object.values(musicAudioRef.current).forEach((a) => a.pause());
      musicAudioRef.current = {};
      Object.values(soundInstancesRef.current).forEach((s) => stopAmbientSound(s));
      soundInstancesRef.current = {};
    };
  }, []);

  const handleClose = () => {
    setPlaying(false);
    speechSynthesis.cancel();
    Object.values(musicAudioRef.current).forEach((a) => a.pause());
    musicAudioRef.current = {};
    Object.values(soundInstancesRef.current).forEach((s) => stopAmbientSound(s));
    soundInstancesRef.current = {};
    onClose();
  };

  const handleReset = () => {
    setPlaying(false);
    setProgress(0);
    setActiveAudioZones(new Set());
    setActiveMusicIds(new Set());
    setActiveSoundIds(new Set());
    setTriggeredStops(new Set());
    speechSynthesis.cancel();
    Object.values(musicAudioRef.current).forEach((a) => a.pause());
    musicAudioRef.current = {};
    Object.values(soundInstancesRef.current).forEach((s) => stopAmbientSound(s));
    soundInstancesRef.current = {};
    if (route.length > 0) updateCarPosition(0);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur-sm rounded-xl shadow-elevated border border-border p-4 w-[420px] max-w-[90vw]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          🚗 Mode test
        </h3>
        <Button variant="ghost" size="sm" onClick={handleClose} className="h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

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

      <div className="flex flex-wrap gap-1.5 text-xs">
        {activeMusicIds.size > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">
            <Music className="w-3 h-3" /> Musique active
          </span>
        )}
        {activeSoundIds.size > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">
            <Waves className="w-3 h-3" /> Son ambiance
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
  );
};

export default CircuitTestMode;
