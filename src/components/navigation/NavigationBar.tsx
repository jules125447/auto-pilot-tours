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
  approachingStart?: boolean;
  distToStart?: number | null;
  etaToStartSeconds?: number | null;
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

function formatSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
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
  approachingStart = false,
  distToStart = null,
  etaToStartSeconds = null,
}: NavigationBarProps) => {
  const arrivalTime = formatArrivalTime(etaMinutes);

  return (
    <div className="relative z-[1000] pointer-events-none">
      {/* Approaching start — show distance/time to departure point */}
      {approachingStart && distToStart !== null && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute left-3 right-3 pointer-events-auto"
          style={{ bottom: "calc(100% + 8px)" }}
        >
          <div className="rounded-2xl bg-card/95 backdrop-blur-xl shadow-elevated flex items-center gap-3 px-4 py-3 border border-primary/20">
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center flex-shrink-0 shadow-glow">
              <Navigation className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-primary/70 font-semibold uppercase tracking-wider">Vers le départ</p>
              <p className="text-sm font-bold text-foreground">Rejoindre le point de départ</p>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-sm font-extrabold text-primary tabular-nums">
                {formatDist(distToStart)}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                ~{etaToStartSeconds !== null ? formatSeconds(etaToStartSeconds) : "—"}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Next POI floating card — only when not approaching start */}
      {!approachingStart && currentStop && !isLastStopDone && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute left-3 right-3 pointer-events-auto"
          style={{ bottom: "calc(100% + 8px)" }}
        >
          <div className="rounded-2xl bg-card/95 backdrop-blur-xl shadow-elevated flex items-center gap-3 px-4 py-3 border border-primary/15">
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center flex-shrink-0 shadow-glow">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-primary/70 font-semibold uppercase tracking-wider">Prochain arrêt</p>
              <p className="text-sm font-bold text-foreground truncate">{currentStop.title}</p>
            </div>
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-sm font-extrabold text-primary tabular-nums">
                {hasGps ? formatDist(distToNextStop) : "—"}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                ~{hasGps && etaNextStop > 0 ? formatEta(etaNextStop) : "—"}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main bottom bar */}
      <div
        className="pointer-events-auto bg-card/95 backdrop-blur-xl border-t-2 border-primary/20"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-3 pb-2">
          {Array.from({ length: totalStops }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i < currentStopIndex
                  ? "w-2 h-2 bg-primary"
                  : i === currentStopIndex
                  ? "w-6 h-2 bg-accent rounded-full"
                  : "w-2 h-2 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center px-4 pb-3">
          {/* Left: ETA / approaching start info */}
          <div className="flex-1">
            {approachingStart && distToStart !== null ? (
              <>
                <p className="text-[11px] text-primary/60 uppercase tracking-wider font-semibold">Jusqu'au départ</p>
                <p className="text-2xl font-bold text-foreground leading-none tabular-nums tracking-tight mt-0.5">
                  {formatDist(distToStart)}
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] text-primary/60 uppercase tracking-wider font-semibold">Arrivée</p>
                <p className="text-2xl font-bold text-foreground leading-none tabular-nums tracking-tight mt-0.5">
                  {arrivalTime}
                </p>
              </>
            )}
          </div>

          {/* Center: distance + time remaining */}
          <div className="flex items-center gap-4">
            {approachingStart && etaToStartSeconds !== null ? (
              <>
                <div className="text-center">
                  <p className="text-lg font-bold text-primary tabular-nums leading-none">
                    {formatSeconds(etaToStartSeconds)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">au départ</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground tabular-nums leading-none">
                    {hasGps ? formatDist(distanceRemaining) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">restant</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-primary tabular-nums leading-none">
                    {hasGps && etaMinutes > 0 ? formatEta(etaMinutes) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">durée</p>
                </div>
              </>
            )}
          </div>

          {/* Right: stop button */}
          <div className="flex-1 flex justify-end">
            {onStop ? (
              <button
                onClick={onStop}
                className="w-11 h-11 rounded-full bg-destructive/10 border border-destructive/25 flex items-center justify-center active:scale-90 transition-all"
                aria-label="Arrêter"
              >
                <X className="w-5 h-5 text-destructive" strokeWidth={2.5} />
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
