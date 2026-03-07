import { motion } from "framer-motion";
import { Navigation, Clock, MapPin } from "lucide-react";

interface NavigationHUDProps {
  circuitTitle: string;
  distance: string | null;
  currentStopTitle: string;
  currentStopIndex: number;
  totalStops: number;
  progress: number;
}

const NavigationHUD = ({
  circuitTitle,
  distance,
  currentStopTitle,
  currentStopIndex,
  totalStops,
  progress,
}: NavigationHUDProps) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
      {/* Top gradient overlay for readability */}
      <div className="h-32 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />

      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-mono uppercase tracking-widest">
              Navigation active
            </span>
          </motion.div>

          {distance && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-white/80 text-sm font-mono"
            >
              {distance}
            </motion.div>
          )}
        </div>

        {/* Circuit name */}
        <motion.h1
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-white text-xl font-bold tracking-tight mb-1 drop-shadow-lg"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {circuitTitle}
        </motion.h1>

        {/* Progress rail */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, hsl(152 50% 42%), hsl(205 55% 50%))",
              }}
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-white/60 text-xs font-mono min-w-[3ch]">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Stop dots */}
        <div className="mt-2 flex items-center gap-1.5">
          {Array.from({ length: totalStops }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < currentStopIndex
                  ? "w-1.5 bg-emerald-400"
                  : i === currentStopIndex
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default NavigationHUD;
