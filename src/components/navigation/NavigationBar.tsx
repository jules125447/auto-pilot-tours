import { motion } from "framer-motion";
import { MapPin, Clock, Navigation2, ChevronRight, ChevronLeft, X } from "lucide-react";

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
  return (
    <div className="relative z-[1000] pointer-events-none">
      {/* Floating "next stop" pill — Waze-style minimal */}
      {currentStop && !isLastStopDone && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-3 mb-2 pointer-events-auto"
        >
          <div className="rounded-full bg-white shadow-[0_4px_18px_rgba(0,0,0,0.18)] border border-black/5 flex items-center gap-2 pl-2 pr-3 py-1.5">
            <button
              onClick={onPrev}
              disabled={currentStopIndex <= 0}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-25 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-700" />
            </button>

            <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-amber-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 leading-none">
                Étape {currentStopIndex + 1}/{totalStops}
              </p>
              <p className="text-sm font-semibold text-neutral-900 truncate leading-tight mt-0.5">
                {currentStop.title}
              </p>
            </div>

            <p className="text-sm font-bold text-neutral-900 tabular-nums flex-shrink-0">
              {hasGps ? formatDist(distToNextStop) : "—"}
            </p>

            <button
              onClick={onNext}
              disabled={currentStopIndex >= totalStops - 1}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-25 active:scale-95 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-neutral-700" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Bottom Waze-style bar: ETA · Time arrival · Distance · Stop button */}
      <div
        className="bg-white rounded-t-3xl shadow-[0_-6px_24px_rgba(0,0,0,0.12)] pointer-events-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-neutral-300" />
        </div>

        <div className="flex items-stretch gap-3 px-4 py-3">
          {/* Three info columns (Waze style) */}
          <div className="flex-1 grid grid-cols-3 gap-1">
            {/* ETA minutes */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-[22px] font-extrabold text-neutral-900 leading-none tabular-nums">
                {hasGps && etaMinutes > 0 ? etaMinutes : "—"}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mt-1">
                min
              </p>
            </div>

            {/* Arrival time */}
            <div className="flex flex-col items-center justify-center border-x border-neutral-200">
              <p className="text-[22px] font-extrabold text-neutral-900 leading-none tabular-nums">
                {formatArrivalTime(etaMinutes)}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                arrivée
              </p>
            </div>

            {/* Distance remaining */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-[22px] font-extrabold text-neutral-900 leading-none tabular-nums">
                {hasGps ? formatDist(distanceRemaining) : "—"}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mt-1">
                restant
              </p>
            </div>
          </div>

          {/* Stop button (Waze has a red square X on the right) */}
          {onStop && (
            <button
              onClick={onStop}
              className="flex-shrink-0 w-14 h-14 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-md"
              aria-label="Arrêter la navigation"
            >
              <X className="w-7 h-7 text-white" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
