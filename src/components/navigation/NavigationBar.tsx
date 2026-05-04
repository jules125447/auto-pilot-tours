import { motion } from "framer-motion";
import { Search, Volume2, X, MapPin, Navigation2 } from "lucide-react";

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
  if (!etaMinutes || etaMinutes <= 0) return "—";
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
      {/* Next POI mini-pill — small info strip above bottom bar */}
      {currentStop && !isLastStopDone && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-4 mb-2 pointer-events-auto"
        >
          <div className="rounded-full bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.12)] flex items-center gap-2 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-neutral-800 truncate flex-1">
              {currentStop.title}
            </p>
            <p className="text-xs font-bold text-amber-600 tabular-nums flex-shrink-0">
              {hasGps ? formatDist(distToNextStop) : "—"}
            </p>
            {hasGps && etaNextStop > 0 && (
              <p className="text-[10px] text-neutral-500 font-medium tabular-nums flex-shrink-0">
                ~{formatEta(etaNextStop)}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Bottom bar — exact Waze layout */}
      <div
        className="bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pointer-events-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
      >
        <div className="flex items-center px-4 py-3 gap-4">
          {/* Left: Search icon placeholder (Waze has it) */}
          <button className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 active:bg-neutral-200 transition-colors">
            <Search className="w-5 h-5 text-neutral-500" />
          </button>

          {/* Center: arrival time big + duration/distance below */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0">
            <p className="text-[28px] font-extrabold text-neutral-900 leading-none tabular-nums">
              {arrivalTime}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-amber-600 tabular-nums">
                {hasGps && etaMinutes > 0 ? formatEta(etaMinutes) : "—"}
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-xs font-semibold text-neutral-500 tabular-nums">
                {hasGps ? formatDist(distanceRemaining) : "—"}
              </span>
            </div>
          </div>

          {/* Right: Stop button (red X like Waze) */}
          {onStop && (
            <button
              onClick={onStop}
              className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 shadow-md"
              aria-label="Arrêter la navigation"
            >
              <X className="w-5 h-5 text-white" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
