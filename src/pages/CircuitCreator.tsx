import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import CircuitEditorMap from "@/components/creator/CircuitEditorMap";
import CreatorToolbar from "@/components/creator/CreatorToolbar";
import CreatorSidebar from "@/components/creator/CreatorSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

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

export type EditorMode = "route" | "stop" | "audio" | "select";

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

  const [route, setRoute] = useState<[number, number][]>([]);
  const [stops, setStops] = useState<StopData[]>([]);
  const [audioZones, setAudioZones] = useState<AudioZoneData[]>([]);
  const [mode, setMode] = useState<EditorMode>("route");
  const [saving, setSaving] = useState(false);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (mode === "route") {
        setRoute((prev) => [...prev, [lat, lng]]);
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
      }
    },
    [mode, stops.length]
  );

  const handleUndoRoute = () => {
    setRoute((prev) => prev.slice(0, -1));
  };

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
        {/* Sidebar */}
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
          selectedStopId={selectedStopId}
          setSelectedStopId={setSelectedStopId}
          selectedAudioId={selectedAudioId}
          setSelectedAudioId={setSelectedAudioId}
          onUpdateStop={handleUpdateStop}
          onDeleteStop={handleDeleteStop}
          onUpdateAudio={handleUpdateAudio}
          onDeleteAudio={handleDeleteAudio}
          onSave={() => handleSave(false)}
          onPublish={() => handleSave(true)}
          saving={saving}
          routePointsCount={route.length}
        />

        {/* Map area */}
        <div className="flex-1 relative">
          <CreatorToolbar mode={mode} setMode={setMode} onUndoRoute={handleUndoRoute} routeLength={route.length} />
          <CircuitEditorMap
            route={route}
            stops={stops}
            audioZones={audioZones}
            mode={mode}
            onMapClick={handleMapClick}
            selectedStopId={selectedStopId}
            selectedAudioId={selectedAudioId}
          />
        </div>
      </div>
    </div>
  );
};

export default CircuitCreator;
