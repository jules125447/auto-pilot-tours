import { motion } from "framer-motion";
import { MapPin, Clock, ChevronRight, ChevronLeft, Locate } from "lucide-react";

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
}

function formatDist(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
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
}: NavigationBarProps) => {
  return (
    <div className="relative z-[1000]">
      {/* Next stop card — hide after last stop is visited */}
      {currentStop && !isLastStopDone && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-3 mb-2 rounded-2xl overflow-hidden bg-card border border-border shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-secondary-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-[0.15em]">
                Prochain arrêt · {currentStopIndex + 1}/{totalStops}
              </p>
              <p className="text-foreground text-base font-semibold truncate">
                {currentStop.title}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-foreground text-lg font-bold font-mono">
                {hasGps ? formatDist(distToNextStop) : "—"}
              </p>
              <p className="text-muted-foreground text-[10px] font-mono">
                {hasGps && etaNextStop > 0 ? `~${etaNextStop} min` : ""}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="px-4 pb-3 flex items-center gap-1">
            {Array.from({ length: totalStops }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i < currentStopIndex
                    ? "flex-1 bg-primary"
                    : i === currentStopIndex
                    ? "flex-[2] bg-secondary"
                    : "flex-1 bg-border"
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Bottom stats bar */}
      <div className="rounded-t-2xl px-4 py-3 flex items-center justify-between bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* Prev button */}
        <button
          onClick={onPrev}
          disabled={currentStopIndex <= 0}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-20 transition-all active:scale-95 bg-muted"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* Remaining distance */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <div className="text-center">
            <p className="text-foreground text-sm font-bold font-mono">
              {hasGps ? formatDist(distanceRemaining) : "—"}
            </p>
            <p className="text-muted-foreground text-[9px] font-mono uppercase">Restant</p>
          </div>
        </div>

        {/* ETA */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-secondary" />
          <div className="text-center">
            <p className="text-foreground text-sm font-bold font-mono">
              {hasGps && etaMinutes > 0 ? `${etaMinutes} min` : "—"}
            </p>
            <p className="text-muted-foreground text-[9px] font-mono uppercase">Temps est.</p>
          </div>
        </div>

        {/* GPS status */}
        <div className="flex items-center gap-1.5">
          <Locate className={`w-4 h-4 ${hasGps ? "text-primary" : "text-destructive"}`} />
          <p className={`text-xs font-bold font-mono ${hasGps ? "text-primary" : "text-destructive"}`}>
            {hasGps ? "GPS" : "—"}
          </p>
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={currentStopIndex >= totalStops - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-20 transition-all active:scale-95 bg-secondary"
        >
          <ChevronRight className="w-5 h-5 text-secondary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default NavigationBar;
