import { useState } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { MapPin, Clock, ChevronUp, CheckCircle2, Volume2, Navigation } from "lucide-react";

interface Stop {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  type: string;
  duration: string | null;
}

interface NavigationBottomSheetProps {
  stops: Stop[];
  currentStopIndex: number;
  visitedStops: Set<string>;
  hasAudio: (stop: Stop) => boolean;
  onSelectStop: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

const stopEmoji: Record<string, string> = {
  viewpoint: "👁️",
  restaurant: "🍽️",
  parking: "🅿️",
  site: "🏛️",
};

const NavigationBottomSheet = ({
  stops,
  currentStopIndex,
  visitedStops,
  hasAudio,
  onSelectStop,
  onNext,
  onPrev,
}: NavigationBottomSheetProps) => {
  const [expanded, setExpanded] = useState(false);
  const currentStop = stops[currentStopIndex];

  if (!currentStop) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000]">
      {/* Bottom gradient overlay */}
      <div className="h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      <div className="bg-black/85 backdrop-blur-xl border-t border-white/10 rounded-t-3xl">
        {/* Drag handle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex justify-center py-2"
        >
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </button>

        {/* Current stop info */}
        <div className="px-5 pb-4">
          <div className="flex items-start gap-4">
            {/* Stop icon */}
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0">
              {stopEmoji[currentStop.type] || "📍"}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-emerald-400 text-[10px] font-mono uppercase tracking-[0.2em] mb-0.5">
                {currentStopIndex === 0 ? "Point de départ" : `Étape ${currentStopIndex + 1}/${stops.length}`}
              </p>
              <h2 className="text-white text-lg font-bold truncate leading-tight">
                {currentStop.title}
              </h2>
              {currentStop.duration && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3 text-white/40" />
                  <span className="text-white/50 text-xs">{currentStop.duration}</span>
                </div>
              )}
            </div>

            {hasAudio(currentStop) && (
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-4 h-4 text-secondary" />
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2.5 mt-4">
            <button
              onClick={onPrev}
              disabled={currentStopIndex === 0}
              className="flex-1 py-3.5 rounded-2xl bg-white/8 text-white font-medium text-sm disabled:opacity-20 transition-all active:scale-[0.98]"
            >
              Précédent
            </button>
            <button
              onClick={onNext}
              disabled={currentStopIndex >= stops.length - 1}
              className="flex-[2] py-3.5 rounded-2xl font-medium text-sm disabled:opacity-20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, hsl(152 50% 35%), hsl(205 55% 45%))",
                color: "white",
              }}
            >
              <Navigation className="w-4 h-4" />
              Étape suivante
            </button>
          </div>
        </div>

        {/* Expanded stop list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="overflow-hidden border-t border-white/8"
            >
              <div className="p-4 space-y-1 max-h-[45vh] overflow-y-auto">
                {stops.map((stop, i) => {
                  const isActive = i === currentStopIndex;
                  const isVisited = visitedStops.has(stop.id);

                  return (
                    <button
                      key={stop.id}
                      onClick={() => {
                        onSelectStop(i);
                        setExpanded(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      }`}
                    >
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isVisited
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isActive
                              ? "bg-white/20 text-white"
                              : "bg-white/5 text-white/30"
                          }`}
                        >
                          {isVisited ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            i + 1
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? "text-white" : "text-white/60"
                          }`}
                        >
                          {stop.title}
                        </p>
                        {stop.duration && (
                          <p className="text-[11px] text-white/30">{stop.duration}</p>
                        )}
                      </div>

                      {hasAudio(stop) && (
                        <Volume2 className="w-3.5 h-3.5 text-secondary/60 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NavigationBottomSheet;
