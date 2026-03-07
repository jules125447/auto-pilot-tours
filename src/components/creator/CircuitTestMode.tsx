import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Square, X, FastForward, Volume2, Music } from "lucide-react";
import type { StopData, AudioZoneData, MusicSegmentData } from "@/pages/CircuitCreator";
import { MUSIC_LIBRARY } from "@/pages/CircuitCreator";
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
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolateRoute(route: [number, number][], progress: number): [number, number] {
  if (route.length === 0) return [0, 0];
  if (route.length === 1 || progress <= 0) return route[0];
  if (progress >= 1) return route[route.length - 1];

  // Calculate total distance
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

// Check if point is within a music segment (between start and end along route progress)
function isInMusicSegment(
  carLat: number,
  carLng: number,
  seg: MusicSegmentData,
  route: [number, number][]
): boolean {
  // Simple proximity check: is the car close to the line between start and end?
  const distToStart = haversineDistance(carLat, carLng, seg.startLat, seg.startLng);
  const distToEnd = haversineDistance(carLat, carLng, seg.endLat, seg.endLng);
  const segLength = haversineDistance(seg.startLat, seg.startLng, seg.endLat, seg.endLng);
  
  // Car is "in segment" if it's closer to both endpoints than the segment length (+ buffer)
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

  const carMarkerRef = useRef<L.Marker | null>(null);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const musicAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  const ttsActiveRef = useRef(false);

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

  // Update car position based on progress
  const updateCarPosition = useCallback(
    (prog: number) => {
      if (!carMarkerRef.current || route.length === 0) return;
      const pos = interpolateRoute(route, prog);
      carMarkerRef.current.setLatLng(pos);

      // Center map on car
      if (mapInstance) {
        mapInstance.panTo(pos, { animate: true, duration: 0.3 });
      }

      // Check audio zones
      const newActiveAudio = new Set<string>();
      audioZones.forEach((zone) => {
        const dist = haversineDistance(pos[0], pos[1], zone.lat, zone.lng);
        if (dist <= zone.radius) {
          newActiveAudio.add(zone.id);
          // Trigger TTS if entering for the first time
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

      // Check stops proximity
      const newTriggered = new Set(triggeredStops);
      stops.forEach((stop) => {
        const dist = haversineDistance(pos[0], pos[1], stop.lat, stop.lng);
        if (dist < 100 && !triggeredStops.has(stop.id)) {
          newTriggered.add(stop.id);
        }
      });
      setTriggeredStops(newTriggered);

      // Check music segments
      const newActiveMusic = new Set<string>();
      musicSegments.forEach((seg) => {
        if (isInMusicSegment(pos[0], pos[1], seg, route)) {
          newActiveMusic.add(seg.id);
        }
      });
      setActiveMusicSegments(newActiveMusic);
    },
    [route, audioZones, musicSegments, stops, mapInstance, activeAudioZones, triggeredStops]
  );

  // Handle music playback based on active segments
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
        const next = prev + dt * 0.02 * speed; // ~50s for full route at 1x
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        updateCarPosition(next);
        return next;
      });

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing, speed, updateCarPosition]);

  // Cleanup on unmount
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
    if (route.length > 0) {
      updateCarPosition(0);
    }
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
        <Button
          size="sm"
          onClick={() => setPlaying(!playing)}
          className="gap-1.5"
        >
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
  );
};

export default CircuitTestMode;
