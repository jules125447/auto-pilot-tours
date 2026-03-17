import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Volume2, Save, Send, Trash2, Loader2, Music, Play, Square, Check, Search, Waves } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StopData, AudioZoneData, MusicSegmentData, SoundSegmentData, EditorMode } from "@/pages/CircuitCreator";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { AMBIENT_SOUNDS, startAmbientSound, stopAmbientSound } from "@/lib/ambientSounds";
import type { AmbientSoundType } from "@/lib/ambientSounds";

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
  musicSegments: MusicSegmentData[];
  soundSegments: SoundSegmentData[];
  selectedStopId: string | null;
  setSelectedStopId: (id: string | null) => void;
  selectedAudioId: string | null;
  setSelectedAudioId: (id: string | null) => void;
  selectedMusicId: string | null;
  setSelectedMusicId: (id: string | null) => void;
  selectedSoundId: string | null;
  setSelectedSoundId: (id: string | null) => void;
  onUpdateStop: (id: string, data: Partial<StopData>) => void;
  onDeleteStop: (id: string) => void;
  onUpdateAudio: (id: string, data: Partial<AudioZoneData>) => void;
  onDeleteAudio: (id: string) => void;
  onUpdateMusic: (id: string, data: Partial<MusicSegmentData>) => void;
  onDeleteMusic: (id: string) => void;
  onUpdateSound: (id: string, data: Partial<SoundSegmentData>) => void;
  onDeleteSound: (id: string) => void;
  onSave: () => void;
  onPublish: () => void;
  saving: boolean;
  routePointsCount: number;
  mode: EditorMode;
}

const stopTypes = [
  { value: "site", label: "🏛️ Site" },
  { value: "viewpoint", label: "👁️ Point de vue" },
  { value: "restaurant", label: "🍽️ Restaurant" },
  { value: "parking", label: "🅿️ Parking" },
];

const estimateAudioDuration = (text: string): number => {
  if (!text.trim()) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil((words / 150) * 60);
};

const estimateAudioDistance = (text: string): number => {
  const durationSec = estimateAudioDuration(text);
  const speedMs = (40 * 1000) / 3600;
  return Math.round(durationSec * speedMs);
};

const AudioPlayButton = ({ text }: { text: string }) => {
  const [playing, setPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const toggle = () => {
    if (playing) { speechSynthesis.cancel(); setPlaying(false); }
    else if (text.trim()) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "fr-FR";
      utter.onend = () => setPlaying(false);
      utterRef.current = utter;
      speechSynthesis.speak(utter);
      setPlaying(true);
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={toggle} className="gap-1" type="button">
      {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      {playing ? "Stop" : "Écouter"}
    </Button>
  );
};

const MusicPlayButton = ({ url }: { url: string }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setPlaying(false);
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const audio = new Audio(url);
      audio.volume = 1;
      audioRef.current = audio;
      audio.onended = () => { setPlaying(false); audioRef.current = null; };
      audio.onerror = () => { setPlaying(false); audioRef.current = null; };
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };
  return (
    <button type="button" onClick={toggle} className="inline-flex items-center justify-center gap-1 shrink-0 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
      {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
    </button>
  );
};

const SoundPreviewButton = ({ soundType }: { soundType: string }) => {
  const [playing, setPlaying] = useState(false);
  const instanceRef = useRef<any>(null);
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (playing && instanceRef.current) {
      await stopAmbientSound(instanceRef.current);
      instanceRef.current = null;
      setPlaying(false);
    } else {
      instanceRef.current = startAmbientSound(soundType as AmbientSoundType, 0.5);
      setPlaying(true);
      // Auto-stop after 5s preview
      setTimeout(async () => {
        if (instanceRef.current) {
          await stopAmbientSound(instanceRef.current);
          instanceRef.current = null;
          setPlaying(false);
        }
      }, 5000);
    }
  };
  return (
    <button type="button" onClick={toggle} className="inline-flex items-center justify-center gap-1 shrink-0 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
      {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
    </button>
  );
};

const CreatorSidebar = ({
  title, setTitle, description, setDescription, region, setRegion,
  difficulty, setDifficulty, duration, setDuration, distance, setDistance,
  stops, audioZones, musicSegments, soundSegments,
  selectedStopId, setSelectedStopId, selectedAudioId, setSelectedAudioId,
  selectedMusicId, setSelectedMusicId, selectedSoundId, setSelectedSoundId,
  onUpdateStop, onDeleteStop, onUpdateAudio, onDeleteAudio,
  onUpdateMusic, onDeleteMusic, onUpdateSound, onDeleteSound,
  onSave, onPublish, saving, routePointsCount, mode,
}: CreatorSidebarProps) => {
  const [musicSearch, setMusicSearch] = useState("");
  const [itunesResults, setItunesResults] = useState<any[]>([]);
  const [itunesLoading, setItunesLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchItunes = useCallback((term: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!term.trim()) { setItunesResults([]); return; }
    setItunesLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=20&entity=song`);
        const data = await res.json();
        setItunesResults(data.results || []);
      } catch { setItunesResults([]); }
      finally { setItunesLoading(false); }
    }, 400);
  }, []);

  useEffect(() => { searchItunes(musicSearch); }, [musicSearch, searchItunes]);

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
          <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-md bg-muted">{routePointsCount} pts route</span>
            <span className="px-2 py-1 rounded-md bg-muted">{stops.length} arrêts</span>
            <span className="px-2 py-1 rounded-md bg-muted">{audioZones.length} audio</span>
            <span className="px-2 py-1 rounded-md bg-muted">{musicSegments.length} musiques</span>
            <span className="px-2 py-1 rounded-md bg-muted">{soundSegments.length} ambiances</span>
          </div>

          {/* Stops */}
          {(mode === "stop" || mode === "select") && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Points d'intérêt</h3>
              {stops.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Cliquez sur la carte en mode "Point d'intérêt" pour ajouter des arrêts.</p>}
              {stops.map((stop) => (
                <div key={stop.id} onClick={() => setSelectedStopId(stop.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedStopId === stop.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  {selectedStopId === stop.id ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Input value={stop.title} onChange={(e) => onUpdateStop(stop.id, { title: e.target.value })} placeholder="Nom de l'arrêt" className="text-sm" />
                      <Textarea value={stop.description} onChange={(e) => onUpdateStop(stop.id, { description: e.target.value })} placeholder="Description..." rows={2} className="text-sm" />
                      <div className="flex gap-2">
                        <Select value={stop.type} onValueChange={(v) => onUpdateStop(stop.id, { type: v })}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{stopTypes.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                        </Select>
                        <Input value={stop.duration} onChange={(e) => onUpdateStop(stop.id, { duration: e.target.value })} placeholder="Durée" className="text-sm w-24" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="default" size="sm" onClick={() => setSelectedStopId(null)} className="flex-1 gap-1"><Check className="w-3.5 h-3.5" /> OK</Button>
                        <Button variant="destructive" size="sm" onClick={() => onDeleteStop(stop.id)} className="flex-1 gap-1"><Trash2 className="w-3.5 h-3.5" /> Supprimer</Button>
                      </div>
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
            </div>
          )}

          {/* Audio zones */}
          {(mode === "audio" || mode === "select") && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Zones audio</h3>
              <p className="text-xs text-muted-foreground">Placez un point sur la carte. La zone de diffusion est estimée automatiquement selon la longueur du texte.</p>
              {audioZones.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Cliquez sur la carte en mode "Zone audio" pour placer un commentaire.</p>}
              {audioZones.map((zone) => {
                const estDistance = estimateAudioDistance(zone.text);
                const estDuration = estimateAudioDuration(zone.text);
                return (
                  <div key={zone.id} onClick={() => setSelectedAudioId(zone.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedAudioId === zone.id ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/30"}`}>
                    {selectedAudioId === zone.id ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <Textarea value={zone.text} onChange={(e) => onUpdateAudio(zone.id, { text: e.target.value })} placeholder="Texte du commentaire audio..." rows={3} className="text-sm" />
                        {zone.text.trim() && (
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-0.5">
                            <p>⏱ Durée estimée : ~{estDuration}s</p>
                            <p>📏 Zone de diffusion : ~{estDistance}m sur le parcours</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <AudioPlayButton text={zone.text} />
                          <Button variant="default" size="sm" onClick={() => setSelectedAudioId(null)} className="flex-1 gap-1"><Check className="w-3.5 h-3.5" /> OK</Button>
                          <Button variant="destructive" size="sm" onClick={() => onDeleteAudio(zone.id)} className="flex-1 gap-1"><Trash2 className="w-3.5 h-3.5" /> Supprimer</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔊</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{zone.text ? zone.text.substring(0, 40) + "..." : "Zone audio sans texte"}</p>
                          <p className="text-xs text-muted-foreground">~{estDistance}m · ~{estDuration}s</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Music segments */}
          {(mode === "music" || mode === "select") && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Music className="w-4 h-4" /> Segments musicaux</h3>
              {musicSegments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">En mode "Musique", cliquez 2 points sur la carte pour définir un segment musical (A→B).</p>}
              {musicSegments.map((seg) => (
                <div key={seg.id} onClick={() => setSelectedMusicId(seg.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedMusicId === seg.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"}`}>
                  {selectedMusicId === seg.id ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs font-semibold text-foreground">Rechercher sur iTunes :</p>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input placeholder="Artiste, titre, album..." value={musicSearch} onChange={(e) => setMusicSearch(e.target.value)} className="text-sm pl-8 h-8" />
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {itunesLoading && <div className="space-y-2 py-1">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>}
                        {!itunesLoading && musicSearch.trim() && itunesResults.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Aucun résultat</p>}
                        {!itunesLoading && !musicSearch.trim() && <p className="text-xs text-muted-foreground text-center py-2">Tapez pour rechercher parmi des millions de titres</p>}
                        {!itunesLoading && itunesResults.map((track: any) => (
                          <div key={track.trackId}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${seg.trackId === String(track.trackId) ? "bg-accent/15 border border-accent" : "bg-muted/50 hover:bg-muted"}`}
                            onClick={() => onUpdateMusic(seg.id, {
                              trackId: String(track.trackId),
                              trackName: track.trackName || track.collectionName,
                              previewUrl: track.previewUrl,
                              artworkUrl: track.artworkUrl60,
                              artistName: track.artistName,
                            })}>
                            {track.artworkUrl60 && <img src={track.artworkUrl60} alt="" className="w-10 h-10 rounded shrink-0" />}
                            {track.previewUrl && <MusicPlayButton url={track.previewUrl} />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{track.trackName}</p>
                              <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
                            </div>
                            {seg.trackId === String(track.trackId) && <span className="text-xs font-semibold text-accent">✓</span>}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="default" size="sm" onClick={() => { setSelectedMusicId(null); setMusicSearch(""); }} className="flex-1 gap-1"><Check className="w-3.5 h-3.5" /> OK</Button>
                        <Button variant="destructive" size="sm" onClick={() => onDeleteMusic(seg.id)} className="flex-1 gap-1"><Trash2 className="w-3.5 h-3.5" /> Supprimer</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {seg.artworkUrl ? <img src={seg.artworkUrl} alt="" className="w-8 h-8 rounded shrink-0" /> : <span className="text-lg">🎵</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{seg.trackName}</p>
                        <p className="text-xs text-muted-foreground truncate">{seg.artistName || "Segment musical"}</p>
                      </div>
                      {seg.previewUrl && <MusicPlayButton url={seg.previewUrl} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sound segments */}
          {(mode === "sound" || mode === "select") && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Waves className="w-4 h-4" /> Sons d'ambiance</h3>
              <p className="text-xs text-muted-foreground">En mode "Ambiance", cliquez 2 points sur la carte pour définir un segment sonore (A→B).</p>
              {soundSegments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun segment d'ambiance. Cliquez sur la carte pour en créer.</p>}
              {soundSegments.map((seg) => {
                const soundInfo = AMBIENT_SOUNDS.find(s => s.type === seg.soundType);
                return (
                  <div key={seg.id} onClick={() => setSelectedSoundId(seg.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedSoundId === seg.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    {selectedSoundId === seg.id ? (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-xs font-semibold text-foreground">Type de son :</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {AMBIENT_SOUNDS.map((sound) => (
                            <button key={sound.type} type="button"
                              onClick={() => onUpdateSound(seg.id, { soundType: sound.type })}
                              className={`flex items-center gap-2 p-2 rounded-md text-sm transition-colors ${
                                seg.soundType === sound.type ? "bg-primary/15 border border-primary text-foreground" : "bg-muted/50 hover:bg-muted text-muted-foreground"
                              }`}>
                              <span>{sound.emoji}</span>
                              <span className="truncate">{sound.label}</span>
                            </button>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Volume : {Math.round(seg.volume * 100)}%</p>
                          <Slider value={[seg.volume]} min={0.1} max={1} step={0.05}
                            onValueChange={([v]) => onUpdateSound(seg.id, { volume: v })} />
                        </div>
                        <div className="flex items-center gap-2">
                          <SoundPreviewButton soundType={seg.soundType} />
                          <span className="text-xs text-muted-foreground">Pré-écouter</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="default" size="sm" onClick={() => setSelectedSoundId(null)} className="flex-1 gap-1"><Check className="w-3.5 h-3.5" /> OK</Button>
                          <Button variant="destructive" size="sm" onClick={() => onDeleteSound(seg.id)} className="flex-1 gap-1"><Trash2 className="w-3.5 h-3.5" /> Supprimer</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{soundInfo?.emoji || "🔈"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{soundInfo?.label || seg.soundType}</p>
                          <p className="text-xs text-muted-foreground">Vol: {Math.round(seg.volume * 100)}%</p>
                        </div>
                        <SoundPreviewButton soundType={seg.soundType} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {mode === "route" && (
            <div className="text-sm text-muted-foreground text-center py-4">
              <MapPin className="w-5 h-5 mx-auto mb-2 opacity-50" />
              Cliquez sur la carte pour tracer votre itinéraire.
            </div>
          )}
        </div>
      </ScrollArea>

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
