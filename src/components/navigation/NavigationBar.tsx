import { motion } from "framer-motion";
import { Search, MapPin, X } from "lucide-react";

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
      {/* Next POI pill — small floating badge above bottom bar */}
      {currentStop && !isLastStopDone && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ bottom: "calc(100% + 8px)" }}
        >
          <div className="rounded-full bg-amber-500 shadow-[0_2px_12px_rgba(0,0,0,0.2)] flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap">
            <MapPin className="w-3 h-3 text-white flex-shrink-0" />
            <span className="text-xs font-semibold text-white truncate max-w-[140px]">
              {currentStop.title}
            </span>
            <span className="text-xs font-bold text-white/80 tabular-nums">
              {hasGps ? formatDist(distToNextStop) : "—"}
            </span>
          </div>
        </motion.div>
      )}

      {/* Bottom bar — exact Waze style: white bg, arrival time center, meta below */}
      <div
        className="bg-white pointer-events-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
      >
        {/* Thin top separator */}
        <div className="h-px bg-neutral-200" />

        <div className="flex items-center px-4 py-3">
          {/* Left: search icon */}
          <button className="w-9 h-9 flex items-center justify-center flex-shrink-0 active:opacity-60 transition-opacity">
            <Search className="w-5 h-5 text-neutral-400" />
          </button>

          {/* Center: arrival time + meta */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-[32px] font-bold text-neutral-900 leading-none tabular-nums tracking-tight">
              {arrivalTime}
            </p>
            <p className="text-xs text-neutral-500 mt-1 tabular-nums">
              <span className="text-amber-600 font-semibold">
                {hasGps && etaMinutes > 0 ? formatEta(etaMinutes) : "—"}
              </span>
              {" · "}
              <span>{hasGps ? formatDist(distanceRemaining) : "—"}</span>
            </p>
          </div>

          {/* Right: stop */}
          {onStop ? (
            <button
              onClick={onStop}
              className="w-9 h-9 flex items-center justify-center flex-shrink-0 active:opacity-60 transition-opacity"
              aria-label="Arrêter"
            >
              <X className="w-6 h-6 text-neutral-400" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
