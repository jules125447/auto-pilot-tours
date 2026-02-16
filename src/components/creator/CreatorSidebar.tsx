import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Volume2, Save, Send, Trash2, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StopData, AudioZoneData } from "@/pages/CircuitCreator";
import { Slider } from "@/components/ui/slider";

interface CreatorSidebarProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  difficulty: string;
  setDifficulty: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  distance: string;
  setDistance: (v: string) => void;
  stops: StopData[];
  audioZones: AudioZoneData[];
  selectedStopId: string | null;
  setSelectedStopId: (id: string | null) => void;
  selectedAudioId: string | null;
  setSelectedAudioId: (id: string | null) => void;
  onUpdateStop: (id: string, data: Partial<StopData>) => void;
  onDeleteStop: (id: string) => void;
  onUpdateAudio: (id: string, data: Partial<AudioZoneData>) => void;
  onDeleteAudio: (id: string) => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
  routePointsCount: number;
}

const stopTypes = [
  { value: "site", label: "🏛️ Site" },
  { value: "viewpoint", label: "👁️ Point de vue" },
  { value: "restaurant", label: "🍽️ Restaurant" },
  { value: "parking", label: "🅿️ Parking" },
];

const CreatorSidebar = ({
  title, setTitle,
  description, setDescription,
  region, setRegion,
  difficulty, setDifficulty,
  duration, setDuration,
  distance, setDistance,
  stops,
  audioZones,
  selectedStopId, setSelectedStopId,
  selectedAudioId, setSelectedAudioId,
  onUpdateStop, onDeleteStop,
  onUpdateAudio, onDeleteAudio,
  onSave, onPublish,
  saving,
  routePointsCount,
}: CreatorSidebarProps) => {
  const selectedStop = stops.find((s) => s.id === selectedStopId);
  const selectedAudio = audioZones.find((a) => a.id === selectedAudioId);

  return (
    <div className="w-80 lg:w-96 border-r border-border bg-card flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Circuit info */}
          <div>
            <h2 className="font-display text-lg font-bold text-foreground mb-3">Informations</h2>
            <div className="space-y-3">
              <Input placeholder="Titre du circuit" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Région" value={region} onChange={(e) => setRegion(e.target.value)} />
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Facile">Facile</SelectItem>
                    <SelectItem value="Modéré">Modéré</SelectItem>
                    <SelectItem value="Difficile">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Durée (ex: 3h)" value={duration} onChange={(e) => setDuration(e.target.value)} />
                <Input placeholder="Distance (ex: 120 km)" value={distance} onChange={(e) => setDistance(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-md bg-muted">{routePointsCount} pts route</span>
            <span className="px-2 py-1 rounded-md bg-muted">{stops.length} arrêts</span>
            <span className="px-2 py-1 rounded-md bg-muted">{audioZones.length} audio</span>
          </div>

          {/* Tabs for stops & audio */}
          <Tabs defaultValue="stops">
            <TabsList className="w-full">
              <TabsTrigger value="stops" className="flex-1 gap-1">
                <MapPin className="w-3.5 h-3.5" /> Arrêts ({stops.length})
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex-1 gap-1">
                <Volume2 className="w-3.5 h-3.5" /> Audio ({audioZones.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stops" className="mt-3 space-y-2">
              {stops.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Cliquez sur la carte en mode "Point d'intérêt" pour ajouter des arrêts.
                </p>
              )}
              {stops.map((stop) => (
                <div
                  key={stop.id}
                  onClick={() => setSelectedStopId(stop.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedStopId === stop.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {selectedStopId === stop.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={stop.title}
                        onChange={(e) => onUpdateStop(stop.id, { title: e.target.value })}
                        placeholder="Nom de l'arrêt"
                        className="text-sm"
                      />
                      <Textarea
                        value={stop.description}
                        onChange={(e) => onUpdateStop(stop.id, { description: e.target.value })}
                        placeholder="Description..."
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Select value={stop.type} onValueChange={(v) => onUpdateStop(stop.id, { type: v })}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {stopTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={stop.duration}
                          onChange={(e) => onUpdateStop(stop.id, { duration: e.target.value })}
                          placeholder="Durée"
                          className="text-sm w-24"
                        />
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => onDeleteStop(stop.id)} className="w-full gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{stopTypes.find((t) => t.value === stop.type)?.label.split(" ")[0] || "📍"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{stop.title}</p>
                        <p className="text-xs text-muted-foreground">{stop.type} · {stop.duration}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="audio" className="mt-3 space-y-2">
              {audioZones.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Cliquez sur la carte en mode "Zone audio" pour placer des commentaires.
                </p>
              )}
              {audioZones.map((zone) => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedAudioId(zone.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAudioId === zone.id
                      ? "border-secondary bg-secondary/5"
                      : "border-border hover:border-secondary/30"
                  }`}
                >
                  {selectedAudioId === zone.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Textarea
                        value={zone.text}
                        onChange={(e) => onUpdateAudio(zone.id, { text: e.target.value })}
                        placeholder="Texte du commentaire audio..."
                        rows={3}
                        className="text-sm"
                      />
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Rayon de déclenchement : {zone.radius}m
                        </label>
                        <Slider
                          value={[zone.radius]}
                          onValueChange={([v]) => onUpdateAudio(zone.id, { radius: v })}
                          min={30}
                          max={500}
                          step={10}
                        />
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => onDeleteAudio(zone.id)} className="w-full gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔊</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {zone.text ? zone.text.substring(0, 40) + "..." : "Zone audio sans texte"}
                        </p>
                        <p className="text-xs text-muted-foreground">Rayon : {zone.radius}m</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Save actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button onClick={onSave} disabled={saving} variant="outline" className="w-full gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder le brouillon
        </Button>
        <Button onClick={onPublish} disabled={saving} className="w-full gap-2 bg-gradient-hero text-primary-foreground">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Publier le circuit
        </Button>
      </div>
    </div>
  );
};

export default CreatorSidebar;
