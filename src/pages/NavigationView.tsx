import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, Navigation, MapPin, ChevronUp, ChevronDown, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import RouteMap from "@/components/RouteMap";

const NavigationView = () => {
  const { id } = useParams();
  const { data: circuit, isLoading } = useCircuit(id);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showStops, setShowStops] = useState(false);
  const [visitedStops, setVisitedStops] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!circuit) return;
    const stop = circuit.stops[currentStopIndex];
    if (!stop) return;
    // Check if there's an audio zone near this stop
    const hasAudio = circuit.audio_zones.some(
      (az) => Math.abs(az.lat - stop.lat) < 0.001 && Math.abs(az.lng - stop.lng) < 0.001
    );
    if (hasAudio) {
      setAudioPlaying(true);
      const timer = setTimeout(() => setAudioPlaying(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStopIndex, circuit]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Link to="/" className="text-primary hover:underline">Retour à l'accueil</Link>
      </div>
    );
  }

  const currentStop = circuit.stops[currentStopIndex];
  const currentAudio = currentStop
    ? circuit.audio_zones.find(
        (az) => Math.abs(az.lat - currentStop.lat) < 0.001 && Math.abs(az.lng - currentStop.lng) < 0.001
      )
    : null;

  const toggleVisited = (stopId: string) => {
    setVisitedStops((prev) => {
      const next = new Set(prev);
      if (next.has(stopId)) next.delete(stopId);
      else next.add(stopId);
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background relative">
      <div className="flex-1 relative">
        <RouteMap route={circuit.route} stops={circuit.stops} className="h-full" interactive />

        <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between">
          <Link to={`/circuit/${circuit.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg glass-card shadow-card text-foreground text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Quitter
          </Link>
          <div className="glass-card shadow-card rounded-lg px-4 py-2 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary animate-pulse-soft" />
            <span className="text-sm font-medium text-foreground">{circuit.distance}</span>
          </div>
        </div>

        <AnimatePresence>
          {audioPlaying && currentAudio?.audio_text && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-4 left-4 right-4 z-[1000] glass-card shadow-elevated rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => setAudioPlaying(false)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <Volume2 className="w-5 h-5 text-secondary-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Audio géolocalisé</p>
                  <p className="text-sm text-foreground leading-relaxed">{currentAudio.audio_text}</p>
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 5, ease: "linear" }} className="h-full bg-secondary rounded-full" />
                  </div>
                </div>
                <button onClick={() => setAudioPlaying(false)} className="p-1 text-muted-foreground">
                  <VolumeX className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-[1000]">
        <button onClick={() => setShowStops(!showStops)} className="w-full flex items-center justify-center py-2 bg-card border-t border-border">
          {showStops ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-muted-foreground" />}
        </button>

        {currentStop && (
          <div className="bg-card border-t border-border px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Prochain arrêt</p>
                <h3 className="font-semibold text-card-foreground">{currentStop.title}</h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" /> {currentStop.duration}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentStopIndex(Math.max(0, currentStopIndex - 1))} disabled={currentStopIndex === 0} className="flex-1 py-3 rounded-xl bg-muted text-foreground font-medium text-sm disabled:opacity-30">
                Précédent
              </button>
              <button onClick={() => { toggleVisited(currentStop.id); setCurrentStopIndex(Math.min(circuit.stops.length - 1, currentStopIndex + 1)); }} className="flex-1 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-medium text-sm">
                Suivant →
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showStops && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-card border-t border-border">
              <div className="p-4 space-y-2 max-h-[40vh] overflow-y-auto">
                {circuit.stops.map((stop, i) => (
                  <button key={stop.id} onClick={() => { setCurrentStopIndex(i); setShowStops(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${i === currentStopIndex ? "bg-primary/10" : "hover:bg-muted"}`}>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {visitedStops.has(stop.id) ? <CheckCircle2 className="w-5 h-5 text-primary" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">{stop.title}</p>
                      <p className="text-xs text-muted-foreground">{stop.duration}</p>
                    </div>
                    {circuit.audio_zones.some((az) => Math.abs(az.lat - stop.lat) < 0.001 && Math.abs(az.lng - stop.lng) < 0.001) && (
                      <Volume2 className="w-4 h-4 text-secondary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NavigationView;
