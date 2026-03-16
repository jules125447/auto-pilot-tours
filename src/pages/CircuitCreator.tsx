import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import CircuitEditorMap from "@/components/creator/CircuitEditorMap";
import CreatorToolbar from "@/components/creator/CreatorToolbar";
import CreatorSidebar from "@/components/creator/CreatorSidebar";
import CircuitTestMode from "@/components/creator/CircuitTestMode";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getRouteSegment, formatDistance, formatDuration } from "@/lib/routing";
import L from "leaflet";

export interface StopData {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  type: string;
  duration: string;
}

export interface AudioZoneData {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  text: string;
}

export interface MusicSegmentData {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  trackId: string;
  trackName: string;
  previewUrl?: string;
  artworkUrl?: string;
  artistName?: string;
}

// MUSIC_LIBRARY removed — now using iTunes Search API

export type EditorMode = "route" | "stop" | "audio" | "music" | "select";

const CircuitCreator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("Nouveau circuit");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [difficulty, setDifficulty] = useState("Facile");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");

  // waypoints are the user-placed control points
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  // route is the full road-snapped polyline
  const [route, setRoute] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const [stops, setStops] = useState<StopData[]>([]);
  const [audioZones, setAudioZones] = useState<AudioZoneData[]>([]);
  const [musicSegments, setMusicSegments] = useState<MusicSegmentData[]>([]);
  const [musicPlacingStart, setMusicPlacingStart] = useState<{ lat: number; lng: number } | null>(null);
  const [mode, setMode] = useState<EditorMode>("route");
  const [testMode, setTestMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);

  // Rebuild the full route from all waypoints
  const rebuildRoute = useCallback(async (newWaypoints: [number, number][]) => {
    if (newWaypoints.length < 2) {
      setRoute(newWaypoints.length === 1 ? [newWaypoints[0]] : []);
      setTotalDistance(0);
      setTotalDuration(0);
      return;
    }

    setRouteLoading(true);
    try {
      // Build segments between consecutive waypoints
      const allCoords: [number, number][] = [];
      let dist = 0;
      let dur = 0;

      for (let i = 0; i < newWaypoints.length - 1; i++) {
        const segment = await getRouteSegment(newWaypoints[i], newWaypoints[i + 1]);
        if (segment) {
          // Avoid duplicating the junction point
          const coords = i === 0 ? segment.coordinates : segment.coordinates.slice(1);
          allCoords.push(...coords);
          dist += segment.distance;
          dur += segment.duration;
        } else {
          // Fallback: straight line
          if (i === 0) allCoords.push(newWaypoints[i]);
          allCoords.push(newWaypoints[i + 1]);
        }
      }

      setRoute(allCoords);
      setTotalDistance(dist);
      setTotalDuration(dur);

      // Auto-fill distance/duration fields
      if (dist > 0) setDistance(formatDistance(dist));
      if (dur > 0) setDuration(formatDuration(dur));
    } catch {
      // Fallback to straight lines
      setRoute(newWaypoints);
    } finally {
      setRouteLoading(false);
    }
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (mode === "route") {
        const newWaypoints: [number, number][] = [...waypoints, [lat, lng]];
        setWaypoints(newWaypoints);
        rebuildRoute(newWaypoints);
      } else if (mode === "stop") {
        const newStop: StopData = {
          id: crypto.randomUUID(),
          title: `Point ${stops.length + 1}`,
          description: "",
          lat,
          lng,
          type: "site",
          duration: "15 min",
        };
        setStops((prev) => [...prev, newStop]);
        setSelectedStopId(newStop.id);
      } else if (mode === "audio") {
        const newZone: AudioZoneData = {
          id: crypto.randomUUID(),
          lat,
          lng,
          radius: 100,
          text: "",
        };
        setAudioZones((prev) => [...prev, newZone]);
        setSelectedAudioId(newZone.id);
      } else if (mode === "music") {
        if (!musicPlacingStart) {
          setMusicPlacingStart({ lat, lng });
          toast({ title: "Point A placé", description: "Cliquez pour placer le point B du segment musical." });
        } else {
          const newSegment: MusicSegmentData = {
            id: crypto.randomUUID(),
            startLat: musicPlacingStart.lat,
            startLng: musicPlacingStart.lng,
            endLat: lat,
            endLng: lng,
            trackId: "",
            trackName: "Aucune musique sélectionnée",
          };
          setMusicSegments((prev) => [...prev, newSegment]);
          setSelectedMusicId(newSegment.id);
          setMusicPlacingStart(null);
        }
      }
    },
    [mode, stops.length, waypoints, rebuildRoute, musicPlacingStart, toast]
  );

  const handleWaypointDrag = useCallback((index: number, lat: number, lng: number) => {
    const newWaypoints: [number, number][] = waypoints.map((wp, i) => i === index ? [lat, lng] : wp);
    setWaypoints(newWaypoints);
    rebuildRoute(newWaypoints);
  }, [waypoints, rebuildRoute]);

  const handleUndoRoute = useCallback(() => {
    const newWaypoints = waypoints.slice(0, -1);
    setWaypoints(newWaypoints);
    rebuildRoute(newWaypoints);
  }, [waypoints, rebuildRoute]);

  const handleClearRoute = useCallback(() => {
    setWaypoints([]);
    setRoute([]);
    setTotalDistance(0);
    setTotalDuration(0);
  }, []);

  const handleDeleteStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    if (selectedStopId === id) setSelectedStopId(null);
  };

  const handleUpdateStop = (id: string, data: Partial<StopData>) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };

  const handleDeleteAudio = (id: string) => {
    setAudioZones((prev) => prev.filter((a) => a.id !== id));
    if (selectedAudioId === id) setSelectedAudioId(null);
  };

  const handleUpdateAudio = (id: string, data: Partial<AudioZoneData>) => {
    setAudioZones((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  };

  const handleDeleteMusic = (id: string) => {
    setMusicSegments((prev) => prev.filter((m) => m.id !== id));
    if (selectedMusicId === id) setSelectedMusicId(null);
  };

  const handleUpdateMusic = (id: string, data: Partial<MusicSegmentData>) => {
    setMusicSegments((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)));
  };

  const handleSave = async (publish: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: circuit, error: circuitErr } = await supabase
        .from("circuits")
        .insert({
          title,
          description,
          region,
          difficulty,
          duration,
          distance,
          route: route as unknown as any,
          creator_id: user.id,
          published: publish,
          price: 0,
        })
        .select("id")
        .single();

      if (circuitErr) throw circuitErr;

      if (stops.length > 0) {
        const { error: stopsErr } = await supabase.from("circuit_stops").insert(
          stops.map((s, i) => ({
            circuit_id: circuit.id,
            title: s.title,
            description: s.description,
            lat: s.lat,
            lng: s.lng,
            stop_type: s.type,
            duration: s.duration,
            sort_order: i,
          }))
        );
        if (stopsErr) throw stopsErr;
      }

      if (audioZones.length > 0) {
        const { error: audioErr } = await supabase.from("audio_zones").insert(
          audioZones.map((a, i) => ({
            circuit_id: circuit.id,
            lat: a.lat,
            lng: a.lng,
            radius_meters: a.radius,
            audio_text: a.text,
            sort_order: i,
          }))
        );
        if (audioErr) throw audioErr;
      }

      if (musicSegments.length > 0) {
        const { error: musicErr } = await supabase.from("music_segments").insert(
          musicSegments.map((m, i) => ({
            circuit_id: circuit.id,
            start_lat: m.startLat,
            start_lng: m.startLng,
            end_lat: m.endLat,
            end_lng: m.endLng,
            track_id: m.trackId,
            track_name: m.trackName,
            artist_name: m.artistName || null,
            preview_url: m.previewUrl || null,
            artwork_url: m.artworkUrl || null,
            sort_order: i,
          }))
        );
        if (musicErr) throw musicErr;
      }

      toast({
        title: publish ? "Circuit publié !" : "Brouillon sauvegardé",
        description: publish
          ? "Votre circuit est maintenant visible par tous."
          : "Vous pourrez le modifier plus tard.",
      });
      navigate(`/circuit/${circuit.id}`);
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de sauvegarder le circuit.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pt-16">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Connectez-vous</h1>
          <p className="text-muted-foreground mb-4">Pour créer des circuits</p>
          <Link to="/auth" className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1 flex pt-16 overflow-hidden">
        <CreatorSidebar
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          region={region}
          setRegion={setRegion}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          duration={duration}
          setDuration={setDuration}
          distance={distance}
          setDistance={setDistance}
          stops={stops}
          audioZones={audioZones}
          musicSegments={musicSegments}
          selectedStopId={selectedStopId}
          setSelectedStopId={setSelectedStopId}
          selectedAudioId={selectedAudioId}
          setSelectedAudioId={setSelectedAudioId}
          selectedMusicId={selectedMusicId}
          setSelectedMusicId={setSelectedMusicId}
          onUpdateStop={handleUpdateStop}
          onDeleteStop={handleDeleteStop}
          onUpdateAudio={handleUpdateAudio}
          onDeleteAudio={handleDeleteAudio}
          onUpdateMusic={handleUpdateMusic}
          onDeleteMusic={handleDeleteMusic}
          onSave={() => handleSave(false)}
          onPublish={() => handleSave(true)}
          saving={saving}
          routePointsCount={waypoints.length}
          mode={mode}
        />

        <div className="flex-1 relative">
          <CreatorToolbar
            mode={mode}
            setMode={setMode}
            onUndoRoute={handleUndoRoute}
            onClearRoute={handleClearRoute}
            routeLength={waypoints.length}
            routeLoading={routeLoading}
            totalDistance={totalDistance}
            totalDuration={totalDuration}
            onTestMode={() => setTestMode(true)}
            canTest={route.length >= 2}
          />
          <CircuitEditorMap
            route={route}
            waypoints={waypoints}
            stops={stops}
            audioZones={audioZones}
            musicSegments={musicSegments}
            musicPlacingStart={musicPlacingStart}
            mode={mode}
            onMapClick={handleMapClick}
            onWaypointDrag={handleWaypointDrag}
            selectedStopId={selectedStopId}
            selectedAudioId={selectedAudioId}
            selectedMusicId={selectedMusicId}
            routeLoading={routeLoading}
            onMapReady={(map) => { mapInstanceRef.current = map; }}
          />
          {testMode && (
            <CircuitTestMode
              route={route}
              stops={stops}
              audioZones={audioZones}
              musicSegments={musicSegments}
              mapInstance={mapInstanceRef.current}
              onClose={() => setTestMode(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CircuitCreator;
