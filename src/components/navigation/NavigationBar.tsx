import { motion } from "framer-motion";
import { MapPin, X, Navigation } from "lucide-react";

interface NavigationBarProps {
  currentStop: {
    id: string;
    title: string;
    type: string;
    duration: string | null;
  } | undefined;
  currentStopIndex: number;
  totalStops: number;
  distanceRemaining: number;
  etaMinutes: number;
  distToNextStop: number;
  etaNextStop: number;
  onNext: () => void;
  onPrev: () => void;
  hasGps: boolean;
  isLastStopDone?: boolean;
  speed?: number | null;
  onStop?: () => void;
}

function formatDist(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatArrivalTime(etaMinutes: number): string {
  if (!etaMinutes || etaMinutes <= 0) return "--:--";
  const arrival = new Date(Date.now() + etaMinutes * 60 * 1000);
  return arrival.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatEta(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m}` : `${h} h`;
}

const NavigationBar = ({
  currentStop,
  currentStopIndex,
  totalStops,
  distanceRemaining,
  etaMinutes,
  distToNextStop,
  etaNextStop,
  onNext,
  onPrev,
  hasGps,
  isLastStopDone = false,
  speed,
  onStop,
}: NavigationBarProps) => {
  const arrivalTime = formatArrivalTime(etaMinutes);

  return (
    <div className="relative z-[1000] pointer-events-none">
      {/* Next POI floating card */}
      {currentStop && !isLastStopDone && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute left-4 right-4 pointer-events-auto"
          style={{ bottom: "calc(100% + 10px)" }}
        >
          <div className="rounded-2xl bg-[#1e1e2a]/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex items-center gap-3 px-4 py-3 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/50 font-medium uppercase tracking-wider">Prochain arrêt</p>
              <p className="text-sm font-semibold text-white truncate">{currentStop.title}</p>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-sm font-bold text-amber-400 tabular-nums">
                {hasGps ? formatDist(distToNextStop) : "—"}
              </span>
              <span className="text-[10px] text-white/40 tabular-nums">
                ~{hasGps && etaNextStop > 0 ? formatEta(etaNextStop) : "—"}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main bottom bar */}
      <div
        className="pointer-events-auto bg-[#1a1a26]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-3 pb-2">
          {Array.from({ length: totalStops }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i < currentStopIndex
                  ? "w-2 h-2 bg-amber-500"
                  : i === currentStopIndex
                  ? "w-6 h-2 bg-amber-400 rounded-full"
                  : "w-2 h-2 bg-white/15"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center px-4 pb-3">
          {/* Left: ETA info */}
          <div className="flex-1">
            <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Arrivée</p>
            <p className="text-2xl font-bold text-white leading-none tabular-nums tracking-tight mt-0.5">
              {arrivalTime}
            </p>
          </div>

          {/* Center: distance + time remaining */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-white tabular-nums leading-none">
                {hasGps ? formatDist(distanceRemaining) : "—"}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">restant</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400 tabular-nums leading-none">
                {hasGps && etaMinutes > 0 ? formatEta(etaMinutes) : "—"}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">durée</p>
            </div>
          </div>

          {/* Right: stop button */}
          <div className="flex-1 flex justify-end">
            {onStop ? (
              <button
                onClick={onStop}
                className="w-11 h-11 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center active:scale-90 transition-all"
                aria-label="Arrêter"
              >
                <X className="w-5 h-5 text-red-400" strokeWidth={2.5} />
              </button>
            ) : (
              <div className="w-11" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
