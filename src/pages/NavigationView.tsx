import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import RouteMap from "@/components/RouteMap";
import NavigationHUD from "@/components/navigation/NavigationHUD";
import NavigationBottomSheet from "@/components/navigation/NavigationBottomSheet";
import AudioOverlay from "@/components/navigation/AudioOverlay";

const NavigationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: circuit, isLoading } = useCircuit(id);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [visitedStops, setVisitedStops] = useState<Set<string>>(new Set());

  const hasAudioForStop = (stop: { lat: number; lng: number }) => {
    if (!circuit) return false;
    return circuit.audio_zones.some(
      (az) => Math.abs(az.lat - stop.lat) < 0.001 && Math.abs(az.lng - stop.lng) < 0.001
    );
  };

  useEffect(() => {
    if (!circuit) return;
    const stop = circuit.stops[currentStopIndex];
    if (!stop) return;
    const hasAudio = hasAudioForStop(stop);
    if (hasAudio) {
      setAudioPlaying(true);
      const timer = setTimeout(() => setAudioPlaying(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStopIndex, circuit]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-white/50 text-sm font-mono">Chargement du circuit...</span>
        </div>
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4">
        <p className="text-white/60 text-sm">Circuit introuvable</p>
        <Link to="/" className="text-emerald-400 text-sm hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const currentStop = circuit.stops[currentStopIndex];
  const currentAudio = currentStop
    ? circuit.audio_zones.find(
        (az) =>
          Math.abs(az.lat - currentStop.lat) < 0.001 &&
          Math.abs(az.lng - currentStop.lng) < 0.001
      )
    : null;

  const progress =
    circuit.stops.length > 1
      ? (currentStopIndex / (circuit.stops.length - 1)) * 100
      : 0;

  const handleNext = () => {
    if (!currentStop) return;
    setVisitedStops((prev) => new Set(prev).add(currentStop.id));
    setCurrentStopIndex((i) => Math.min(circuit.stops.length - 1, i + 1));
  };

  const handlePrev = () => {
    setCurrentStopIndex((i) => Math.max(0, i - 1));
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden" style={{ background: "#0a0a0a" }}>
      {/* Full-screen map */}
      <div className="flex-1 relative">
        <RouteMap route={circuit.route} stops={circuit.stops} className="h-full" interactive />

        {/* Back button — floating */}
        <Link
          to={`/circuit/${circuit.id}`}
          className="absolute top-4 left-4 z-[1001] w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:bg-black/80 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </Link>

        {/* HUD overlay */}
        <NavigationHUD
          circuitTitle={circuit.title}
          distance={circuit.distance}
          currentStopTitle={currentStop?.title || ""}
          currentStopIndex={currentStopIndex}
          totalStops={circuit.stops.length}
          progress={progress}
        />

        {/* Audio overlay */}
        <AnimatePresence>
          {audioPlaying && currentAudio?.audio_text && (
            <AudioOverlay
              text={currentAudio.audio_text}
              onDismiss={() => setAudioPlaying(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom sheet */}
      <NavigationBottomSheet
        stops={circuit.stops}
        currentStopIndex={currentStopIndex}
        visitedStops={visitedStops}
        hasAudio={hasAudioForStop}
        onSelectStop={setCurrentStopIndex}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </div>
  );
};

export default NavigationView;
