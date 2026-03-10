import { motion } from "framer-motion";
import { Navigation, MapPin, Clock, ChevronRight, Locate } from "lucide-react";

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
}: NavigationBarProps) => {
  return (
    <div className="relative z-[1000]">
      {/* Next stop direction banner */}
      {currentStop && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-3 mb-2 rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(152 45% 28%), hsl(152 45% 22%))",
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(152 50% 35%)" }}
            >
              <Navigation className="w-5 h-5 text-primary-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-primary-foreground/60 text-[10px] font-mono uppercase tracking-[0.15em]">
                Prochain point d'intérêt
              </p>
              <p className="text-primary-foreground text-base font-semibold truncate">
                {currentStop.title}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-primary-foreground text-lg font-bold font-mono">
                {hasGps ? formatDist(distToNextStop) : "—"}
              </p>
              <p className="text-primary-foreground/50 text-[10px] font-mono">
                {hasGps && etaNextStop > 0 ? `~${etaNextStop} min` : ""}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="px-4 pb-3 flex items-center gap-1">
            {Array.from({ length: totalStops }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i < currentStopIndex
                    ? "flex-1 bg-primary-foreground/40"
                    : i === currentStopIndex
                    ? "flex-[2] bg-primary-foreground"
                    : "flex-1 bg-primary-foreground/15"
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Bottom stats bar */}
      <div
        className="rounded-t-2xl px-4 py-3 flex items-center justify-between"
        style={{ background: "hsl(160 20% 10%)" }}
      >
        {/* Remaining distance */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <div>
            <p className="text-primary-foreground text-sm font-bold font-mono">
              {hasGps ? formatDist(distanceRemaining) : "—"}
            </p>
            <p className="text-primary-foreground/40 text-[9px] font-mono uppercase">Restant</p>
          </div>
        </div>

        {/* ETA */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-secondary" />
          <div>
            <p className="text-primary-foreground text-sm font-bold font-mono">
              {hasGps && etaMinutes > 0 ? `${etaMinutes} min` : "—"}
            </p>
            <p className="text-primary-foreground/40 text-[9px] font-mono uppercase">Temps est.</p>
          </div>
        </div>

        {/* GPS status */}
        <div className="flex items-center gap-2">
          <Locate className={`w-4 h-4 ${hasGps ? "text-primary" : "text-destructive"}`} />
          <div>
            <p className={`text-sm font-bold font-mono ${hasGps ? "text-primary" : "text-destructive"}`}>
              {hasGps ? "GPS" : "No GPS"}
            </p>
            <p className="text-primary-foreground/40 text-[9px] font-mono uppercase">Signal</p>
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={currentStopIndex >= totalStops - 1}
          className="w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-20 transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, hsl(152 50% 35%), hsl(205 55% 45%))",
          }}
        >
          <ChevronRight className="w-6 h-6 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default NavigationBar;
